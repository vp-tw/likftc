const previousValues = new WeakMap<HTMLElement, number>();

interface DigitTransition {
  readonly next: HTMLElement;
  readonly previous: HTMLElement;
}

function createCharacter(value: string, className: string): HTMLSpanElement {
  const character = document.createElement("span");
  character.className = `number-flow-character ${className}`;
  character.textContent = value === " " ? "\u00a0" : value;
  return character;
}

function cancelTargetAnimations(target: HTMLElement): void {
  for (const animation of target.getAnimations({ subtree: true })) animation.cancel();
}

function animateDigit(transition: DigitTransition, direction: -1 | 1, delay: number): void {
  const options: KeyframeAnimationOptions = {
    delay,
    duration: 360,
    easing: "cubic-bezier(0.16, 1, 0.3, 1)",
    fill: "both",
  };
  const previousAnimation = transition.previous.animate(
    [
      { filter: "blur(0)", opacity: 1, transform: "translateY(0)" },
      {
        filter: "blur(0.08em)",
        opacity: 0,
        transform: `translateY(${direction * 115}%)`,
      },
    ],
    options,
  );
  const nextAnimation = transition.next.animate(
    [
      {
        filter: "blur(0.08em)",
        opacity: 0,
        transform: `translateY(${-direction * 115}%)`,
      },
      { filter: "blur(0)", opacity: 1, transform: "translateY(0)" },
    ],
    options,
  );
  previousAnimation.id = "likftc-number-flow";
  nextAnimation.id = "likftc-number-flow";
  void previousAnimation.finished.catch(() => undefined);
  void nextAnimation.finished.catch(() => undefined);
}

export function setNumberFlowValue(
  target: HTMLElement,
  value: number,
  shouldAnimate: boolean,
): void {
  if (!Number.isFinite(value)) throw new TypeError("Number flow value must be finite");
  const normalizedValue = Math.round(value);
  const previousValue = previousValues.get(target);
  if (
    shouldAnimate &&
    previousValue === normalizedValue &&
    target.dataset["numberFlow"] === "ready"
  ) {
    return;
  }
  previousValues.set(target, normalizedValue);
  cancelTargetAnimations(target);

  const nextText = String(normalizedValue);
  const previousText = previousValue === undefined ? nextText : String(previousValue);
  const digitCount = Math.max(previousText.length, nextText.length);
  const previousDigits = previousText.padStart(digitCount, " ");
  const nextDigits = nextText.padStart(digitCount, " ");
  const visible = document.createElement("span");
  visible.className = "number-flow";
  visible.setAttribute("aria-hidden", "true");
  const digits = document.createElement("span");
  digits.className = "number-flow-digits";
  const transitions: Array<DigitTransition> = [];

  for (let index = 0; index < digitCount; index += 1) {
    const previousDigit = previousDigits[index];
    const nextDigit = nextDigits[index];
    if (previousDigit === undefined || nextDigit === undefined) {
      throw new Error(`Missing number flow digit ${index}`);
    }
    const slot = document.createElement("span");
    slot.className = "number-flow-digit";
    if (shouldAnimate && previousValue !== undefined && previousDigit !== nextDigit) {
      const previous = createCharacter(previousDigit, "number-flow-character-previous");
      const next = createCharacter(nextDigit, "number-flow-character-next");
      slot.append(previous, next);
      transitions.push({ next, previous });
    } else {
      slot.append(createCharacter(nextDigit, "number-flow-character-static"));
    }
    digits.append(slot);
  }

  const unit = document.createElement("span");
  unit.className = "number-flow-unit";
  unit.textContent = "ms";
  visible.append(digits, unit);
  const accessibleValue = document.createElement("span");
  accessibleValue.className = "number-flow-sr";
  accessibleValue.textContent = `${normalizedValue} milliseconds`;
  target.dataset["numberFlow"] = "ready";
  target.dataset["numberFlowValue"] = String(normalizedValue);
  target.replaceChildren(visible, accessibleValue);

  if (previousValue === undefined || transitions.length === 0) return;
  const direction = normalizedValue > previousValue ? -1 : 1;
  transitions.forEach((transition, index) => animateDigit(transition, direction, index * 24));
}

export function cancelNumberFlowAnimations(root: ParentNode): void {
  for (const target of root.querySelectorAll<HTMLElement>('[data-number-flow="ready"]')) {
    const value = Number(target.dataset["numberFlowValue"]);
    if (Number.isFinite(value)) setNumberFlowValue(target, value, false);
    else cancelTargetAnimations(target);
  }
}
