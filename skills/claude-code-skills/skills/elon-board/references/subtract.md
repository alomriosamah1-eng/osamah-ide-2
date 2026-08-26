# Subtract

Phase 2. Runs **before** any shape is drawn.

Order matters. Shaping a thing you should not build wastes the work, and worse, it makes everyone attached to it. By the time a decomposition exists on the page, "should this exist" has become an awkward question instead of the obvious one.

---

## The three questions

### 1. Is this several things?

Most feature asks are a bundle. "A dashboard" is usually four things: a number people check daily, an alert nobody configured, a chart nobody reads, and an export one person needs monthly.

Name each one separately. For each, ask whether it earns its place **independently** of the others. The ones that only survive because they arrived in the same sentence are the ones to cut.

### 2. What is the 10% version?

The smallest thing that delivers the actual value, not the smallest thing that technically satisfies the description.

State it even when the answer is "the full ask already is the 10% version." Saying so explicitly is worth more than skipping the question, because it tells the user you checked.

### 3. Is this a proxy?

People ask for the solution they imagined, not the outcome they want. "I want a notification when a lead goes cold" is a proxy for "I don't want to lose deals I already paid to get."

Name the outcome. Then check whether something cheaper reaches it. Sometimes the honest answer is that the outcome is already reached by something that exists and the real problem is that nobody knew.

---

## Verdicts

| verdict | means |
|---|---|
| `BUILD AS ASKED` | the ask survives all three questions intact |
| `BUILD LESS` | a subset earns its place; the rest is named and set aside |
| `BUILD SOMETHING ELSE` | the ask is a proxy; the cheaper thing that reaches the outcome is named |
| `DO NOT BUILD` | the outcome is already reached, or the cost exceeds it |

On anything other than `BUILD AS ASKED`, **present the verdict and stop.** The user confirms before the run continues. This is not a recommendation to be noted and passed, it is a fork in the run.

---

## What a good refusal looks like

A bad refusal is discouraging and vague. A good one is specific, quantified, and hands back a better path in the same breath.

> **BUILD LESS.** This is three features. The daily number is the one that earns its place: you would open it every morning and it changes a decision. The alert has no configured threshold and nothing to compare against yet, so it would fire on noise. The export serves one person once a month, which is a query you can run in 30 seconds when they ask. Build the number, ship it, and let the other two prove they are wanted by someone asking twice.

Note what that does. It names each part, gives the reason each survives or does not, and the reason is about use rather than taste. It ends pointing forward.

Never refuse on grounds of complexity or effort alone. "That is a lot of work" is not an argument; "that work buys nothing you cannot get from the 10% version" is.

---

## When not to subtract

Be honest about the limit of this pass. Do not cut:

- something the user has already decided and is not asking your opinion on
- a part whose job you do not understand yet, ask instead
- something small enough that the conversation about cutting it costs more than building it
- a part that exists for a person the user named, that is the opposite of a department requirement

The pass has a bias toward cutting. Say so when you use it, and do not pretend a judgment call is a measurement.
