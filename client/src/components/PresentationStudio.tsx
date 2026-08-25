import { skipToken } from "@tanstack/react-query";
import { ChevronDown, ChevronLeft, ChevronRight, CircleAlert, Loader2, Play, Plus, Presentation, RefreshCw, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { getPresentationLoadErrorMessage } from "@/components/presentation-studio-status";
import "./presentation-studio.css";

type Language = "ar" | "en";

export default function PresentationStudio({ lang }: { lang: Language }) {
  const isAr = lang === "ar";
  const utils = trpc.useUtils();
  const decksQuery = trpc.presentations.list.useQuery();
  const presentonStatus = trpc.presenton.status.useQuery();
  const [selectedDeckId, setSelectedDeckId] = useState<number | null>(null);
  const selectedDeck = (decksQuery.data ?? []).find(deck => deck.id === selectedDeckId) ?? null;
  const slidesQuery = trpc.presentations.slide.list.useQuery(selectedDeck ? { presentationId: selectedDeck.id } : skipToken);
  const [selectedSlideId, setSelectedSlideId] = useState<number | null>(null);
  const selectedSlide = (slidesQuery.data ?? []).find(slide => slide.id === selectedSlideId) ?? null;
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [draftNotes, setDraftNotes] = useState("");
  const [notesExpanded, setNotesExpanded] = useState(true);

  const refreshDecks = () => void utils.presentations.list.invalidate();
  const refreshSlides = () => {
    void utils.presentations.slide.list.invalidate();
    void utils.workspace.activity.list.invalidate();
  };
  const createDeck = trpc.presentations.create.useMutation({ onSuccess: deck => { refreshDecks(); setSelectedDeckId(deck.id); } });
  const updateDeck = trpc.presentations.update.useMutation({ onSuccess: refreshDecks });
  const removeDeck = trpc.presentations.remove.useMutation({ onSuccess: () => { refreshDecks(); setSelectedDeckId(null); setSelectedSlideId(null); } });
  const createSlide = trpc.presentations.slide.create.useMutation({ onSuccess: slide => { refreshSlides(); setSelectedSlideId(slide.id); } });
  const updateSlide = trpc.presentations.slide.update.useMutation({ onSuccess: refreshSlides });
  const removeSlide = trpc.presentations.slide.remove.useMutation({ onSuccess: () => { refreshSlides(); setSelectedSlideId(null); } });
  const reorderSlides = trpc.presentations.slide.reorder.useMutation({ onSuccess: refreshSlides });
  const isMutating = createDeck.isPending || updateDeck.isPending || removeDeck.isPending || createSlide.isPending || updateSlide.isPending || removeSlide.isPending || reorderSlides.isPending;
  const actionError = createDeck.error ?? updateDeck.error ?? removeDeck.error ?? createSlide.error ?? updateSlide.error ?? removeSlide.error ?? reorderSlides.error;
  const decksLoadError = decksQuery.isError ? getPresentationLoadErrorMessage("decks", lang, decksQuery.error) : null;
  const slidesLoadError = selectedDeck && slidesQuery.isError ? getPresentationLoadErrorMessage("slides", lang, slidesQuery.error) : null;
  const presentonLoadError = presentonStatus.isError ? getPresentationLoadErrorMessage("presenton", lang, presentonStatus.error) : null;

  useEffect(() => {
    const first = decksQuery.data?.[0];
    if (!selectedDeckId && first) setSelectedDeckId(first.id);
    if (selectedDeckId && !(decksQuery.data ?? []).some(deck => deck.id === selectedDeckId)) setSelectedDeckId(first?.id ?? null);
  }, [decksQuery.data, selectedDeckId]);

  useEffect(() => {
    const first = slidesQuery.data?.[0];
    if (!selectedSlideId && first) setSelectedSlideId(first.id);
    if (selectedSlideId && !(slidesQuery.data ?? []).some(slide => slide.id === selectedSlideId)) setSelectedSlideId(first?.id ?? null);
  }, [slidesQuery.data, selectedSlideId]);

  useEffect(() => {
    setDraftTitle(selectedSlide?.title ?? "");
    setDraftContent(selectedSlide?.content ?? "");
    setDraftNotes(selectedSlide?.speakerNotes ?? "");
  }, [selectedSlide?.id, selectedSlide?.title, selectedSlide?.content, selectedSlide?.speakerNotes]);

  const askForDeck = () => {
    const title = window.prompt(isAr ? "عنوان العرض الجديد" : "New presentation title");
    if (title?.trim()) createDeck.mutate({ title: title.trim() });
  };
  const askToRenameDeck = () => {
    if (!selectedDeck) return;
    const title = window.prompt(isAr ? "عنوان العرض" : "Presentation title", selectedDeck.title);
    if (title?.trim() && title.trim() !== selectedDeck.title) updateDeck.mutate({ id: selectedDeck.id, title: title.trim() });
  };
  const addSlide = () => {
    if (!selectedDeck) return;
    createSlide.mutate({ presentationId: selectedDeck.id, title: isAr ? "شريحة جديدة" : "New slide", content: "", speakerNotes: "" });
  };
  const moveSlide = (direction: -1 | 1) => {
    if (!selectedDeck || !selectedSlide || !slidesQuery.data) return;
    const ids = slidesQuery.data.map(slide => slide.id);
    const index = ids.indexOf(selectedSlide.id);
    const next = index + direction;
    if (next < 0 || next >= ids.length) return;
    [ids[index], ids[next]] = [ids[next], ids[index]];
    reorderSlides.mutate({ presentationId: selectedDeck.id, orderedSlideIds: ids });
  };
  const saveSlide = () => {
    if (!selectedSlide) return;
    updateSlide.mutate({ id: selectedSlide.id, title: draftTitle.trim() || null, content: draftContent, speakerNotes: draftNotes });
  };
  const hasSlideChanges = Boolean(selectedSlide && (draftTitle !== (selectedSlide.title ?? "") || draftContent !== (selectedSlide.content ?? "") || draftNotes !== (selectedSlide.speakerNotes ?? "")));
  const generationAvailable = presentonStatus.data?.generationEnabled === true;

  return <div className="presentations-view workspace-view presentation-studio" dir={isAr ? "rtl" : "ltr"}>
    <div className="presentation-ribbon">
      <div className="deck-name"><Presentation size={17} /><span>{selectedDeck?.title ?? (isAr ? "العروض" : "Presentations")}</span><span className="saved-state">{isMutating ? <Loader2 size={13} className="spin" /> : <Save size={13} />} {isMutating ? (isAr ? "جارٍ الحفظ" : "Saving") : (isAr ? "محفوظ خادمياً" : "Server-saved")}</span></div>
      <div className="ribbon-menu"><button type="button" className="ribbon-active" onClick={askForDeck} disabled={isMutating}><Plus size={14} /> {isAr ? "عرض جديد" : "New deck"}</button>{selectedDeck ? <button type="button" onClick={askToRenameDeck} disabled={isMutating}>{isAr ? "إعادة تسمية" : "Rename"}</button> : null}</div>
      <div className="ribbon-actions"><button type="button" title={generationAvailable ? undefined : (isAr ? "التقديم/التوليد غير مهيأ في Presenton." : "Presenton presentation generation is not configured.")} disabled={!generationAvailable}><Play size={14} /> {isAr ? "تقديم" : "Present"}</button>{selectedDeck ? <button type="button" className="danger-icon-action" onClick={() => { if (window.confirm(isAr ? "حذف العرض وكل شرائحه؟" : "Delete this presentation and its slides?")) removeDeck.mutate({ id: selectedDeck.id }); }} disabled={isMutating} aria-label={isAr ? "حذف العرض" : "Delete presentation"}><Trash2 size={16} /></button> : null}</div>
    </div>
    <div className={`presenton-status presenton-${presentonLoadError ? "error" : (presentonStatus.data?.phase ?? "checking")}`} role="status" aria-live="polite"><span>{presentonLoadError ? <><CircleAlert size={15} /> <strong>{presentonLoadError}</strong></> : <>{isAr ? "حالة Presenton" : "Presenton status"}: <strong>{presentonStatus.data?.detail ?? (isAr ? "يُفحص الجسر الخادمي…" : "Checking server bridge…")}</strong></>}</span><button type="button" onClick={() => void presentonStatus.refetch()} disabled={presentonStatus.isFetching}><RefreshCw size={13} /> {presentonLoadError ? (isAr ? "أعد المحاولة" : "Retry") : (isAr ? "تحديث" : "Refresh")}</button></div>
    <div className="presentation-grid">
      <aside className="slide-navigator glass-panel">
        <div className="presentation-nav-title"><strong>{isAr ? "العروض" : "Decks"}</strong><button type="button" onClick={askForDeck} disabled={isMutating} aria-label={isAr ? "عرض جديد" : "New presentation"}><Plus size={14} /></button></div>
        <div className="presentation-decks-list">{decksQuery.isLoading ? <p>{isAr ? "تُحمّل العروض…" : "Loading presentations…"}</p> : null}{decksLoadError ? <div className="presentation-load-error" role="alert"><CircleAlert size={17} /><strong>{decksLoadError}</strong><button type="button" onClick={() => void decksQuery.refetch()}>{isAr ? "أعد المحاولة" : "Retry"}</button></div> : null}{!decksQuery.isLoading && !decksLoadError && (decksQuery.data?.length ?? 0) === 0 ? <div className="presentation-empty"><Presentation size={24} /><strong>{isAr ? "لا توجد عروض محفوظة" : "No saved presentations"}</strong><button type="button" onClick={askForDeck}>{isAr ? "إنشاء عرض" : "Create presentation"}</button></div> : null}{decksQuery.data?.map(deck => <button type="button" key={deck.id} onClick={() => { setSelectedDeckId(deck.id); setSelectedSlideId(null); }} className={`presentation-deck-row ${deck.id === selectedDeck?.id ? "deck-selected" : ""}`}><span>{deck.title}</span><small>{deck.status === "draft" ? (isAr ? "مسودة" : "Draft") : deck.status}</small></button>)}</div>
        {selectedDeck ? <><div className="presentation-nav-title presentation-slides-heading"><strong>{isAr ? "الشرائح" : "Slides"}</strong><button type="button" onClick={addSlide} disabled={isMutating} aria-label={isAr ? "شريحة جديدة" : "New slide"}><Plus size={14} /></button></div><div className="slides-list">{slidesQuery.isLoading ? <p>{isAr ? "تُحمّل الشرائح…" : "Loading slides…"}</p> : null}{slidesLoadError ? <div className="presentation-load-error" role="alert"><CircleAlert size={17} /><strong>{slidesLoadError}</strong><button type="button" onClick={() => void slidesQuery.refetch()}>{isAr ? "أعد المحاولة" : "Retry"}</button></div> : null}{!slidesQuery.isLoading && !slidesLoadError && (slidesQuery.data?.length ?? 0) === 0 ? <p>{isAr ? "أضف الشريحة الأولى." : "Add the first slide."}</p> : null}{slidesQuery.data?.map((slide, index) => <button type="button" onClick={() => setSelectedSlideId(slide.id)} className={`slide-thumb ${slide.id === selectedSlide?.id ? "slide-selected" : ""}`} key={slide.id}><span className="slide-number">{String(index + 1).padStart(2, "0")}</span><span className="mini-slide"><i /><i /><i /></span><strong>{slide.title || (isAr ? "بلا عنوان" : "Untitled")}</strong></button>)}</div></> : null}
      </aside>
      <section className="slide-workbench">
        {selectedDeck && selectedSlide ? <><div className="canvas-tools"><button type="button" onClick={addSlide} disabled={isMutating}><Plus size={14} /> {isAr ? "شريحة" : "Slide"}</button><button type="button" onClick={() => moveSlide(-1)} disabled={isMutating || selectedSlide.position === 0} aria-label={isAr ? "تحريك لأعلى" : "Move up"}>{isAr ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}</button><button type="button" onClick={() => moveSlide(1)} disabled={isMutating || selectedSlide.position === (slidesQuery.data?.length ?? 1) - 1} aria-label={isAr ? "تحريك لأسفل" : "Move down"}>{isAr ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}</button><button type="button" className="danger-action" onClick={() => { if (window.confirm(isAr ? "حذف هذه الشريحة؟" : "Delete this slide?")) removeSlide.mutate({ id: selectedSlide.id }); }} disabled={isMutating}><Trash2 size={14} /> {isAr ? "حذف" : "Delete"}</button><button type="button" className="save-action" onClick={saveSlide} disabled={isMutating || !hasSlideChanges}><Save size={14} /> {isAr ? "حفظ" : "Save"}</button></div><div className="presentation-editor-fields"><label>{isAr ? "عنوان الشريحة" : "Slide title"}<input value={draftTitle} onChange={event => setDraftTitle(event.target.value)} disabled={isMutating} /></label><label>{isAr ? "محتوى الشريحة" : "Slide content"}<textarea value={draftContent} onChange={event => setDraftContent(event.target.value)} disabled={isMutating} /></label></div><div className="speaker-notes"><button type="button" onClick={() => setNotesExpanded(expanded => !expanded)} aria-expanded={notesExpanded}><ChevronDown size={15} /> {isAr ? "ملاحظات المتحدث" : "Speaker notes"}</button>{notesExpanded ? <textarea value={draftNotes} onChange={event => setDraftNotes(event.target.value)} disabled={isMutating} aria-label={isAr ? "ملاحظات المتحدث" : "Speaker notes"} /> : null}</div></> : <div className="presentation-empty-workbench"><Presentation size={34} /><strong>{selectedDeck ? (isAr ? "اختر شريحة أو أنشئ واحدة" : "Select or create a slide") : (isAr ? "اختر عرضاً أو أنشئ عرضاً جديداً" : "Select or create a presentation")}</strong>{selectedDeck ? <button type="button" onClick={addSlide}>{isAr ? "إضافة شريحة" : "Add slide"}</button> : <button type="button" onClick={askForDeck}>{isAr ? "إنشاء عرض" : "Create presentation"}</button>}</div>}
        {actionError ? <p className="workspace-operation-error" role="alert"><CircleAlert size={15} /> {actionError.message}</p> : null}
      </section>
    </div>
  </div>;
}
