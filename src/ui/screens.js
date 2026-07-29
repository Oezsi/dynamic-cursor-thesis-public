/**
* screens.js
*
* Renders the non-tiral screens as a DOM overlay on top of the canvas
*/

import { texts } from "../core/text.js";

function clear(el) {
   el.innerHTML = "";
}

function el(tag, className, text) {
   const node = document.createElement(tag);
   if (className) node.className = className;
   if (text != null) node.textContent = text;
   return node;
}

function appendBlock(box, block) {
   if (!block) return;
   if (typeof block === "object" && Array.isArray(block.list)) {
      const ul = el("ul", "card-list");
      for (const item of block.list) ul.appendChild(el("li", "card-list-item", item));
      box.appendChild(ul);
      return;
   }
   box.appendChild(el("p", "card-body", block));
}

// Renders a card with a title, body paragraphs and an optional continue button.
// A paragraph may be a string or a { list: [...] } object rendered as a bullet list.
function card(overlay, { title, subtitle, paragraphs = [], buttonLabel, onContinue, hint }) {
   clear(overlay);
   const box = el("div", "card");
   if (title) box.appendChild(el("h1", "card-title", title));
   if (subtitle) box.appendChild(el("p", "card-subtitle", subtitle));
   for (const p of paragraphs) appendBlock(box, p);
   if (buttonLabel) {
      const btn = el("button", "btn", buttonLabel);
      btn.addEventListener("click", () => onContinue && onContinue());
      box.appendChild(btn);
   }
   if (hint) box.appendChild(el("p", "card-hint", hint));
   overlay.appendChild(box);
   return box;
}

export function renderWelcome(overlay, onContinue) {
   card(overlay, {
      title: texts.title,
      subtitle: texts.subtitle,
      paragraphs: texts.welcomeBody,
      buttonLabel: texts.continueButton,
      onContinue,
      hint: texts.continueHint,
   });
}

// Config-error screen shown when the cursor/axes URL parameters are missing or invalid
export function renderConfigError(overlay, { missing = [] }) {
   const t = texts.configError;
   card(overlay, {
      title: t.title,
      paragraphs: [t.body, missing.length ? t.missing(missing) : ""].filter(Boolean),
   });
}

// Demographics form. Calls onSubmit with { age, sex, handedness }. 
// The submit button stays disabled until every field is answered,
// the required device is selected and consent is given.
export function renderDemographics(overlay, onSubmit, onBack) {
   clear(overlay);
   const d = texts.demographics;
   const box = el("div", "card");
   box.appendChild(el("h1", "card-title", d.title));
   box.appendChild(el("p", "card-body", d.body));

   const form = el("div", "form");

   function radioGroup(name, options) {
      const wrap = el("div", "radio-group");
      const inputs = [];
      for (const opt of options) {
         const row = el("label", "radio-option");
         const input = el("input");
         input.type = "radio";
         input.name = name;
         input.value = opt;
         row.appendChild(input);
         row.appendChild(el("span", null, opt));
         wrap.appendChild(row);
         inputs.push(input);
      }
      return {
         wrap,
         value: () => {
            const hit = inputs.find((i) => i.checked);
            return hit ? hit.value : null;
         },
      };
   }

   function question(labelText, node) {
      const group = el("div", "form-group");
      group.appendChild(el("p", "form-question", labelText));
      group.appendChild(node);
      return group;
   }

   const age = el("input");
   age.type = "number";
   age.min = "0";
   age.className = "input input-narrow";

   const gender = radioGroup("gender", d.genderOptions);
   const hand = radioGroup("handedness", d.handednessOptions);
   const device = radioGroup("inputDevice", d.inputDeviceOptions);

   form.appendChild(question(d.ageLabel, age));
   form.appendChild(question(d.genderLabel, gender.wrap));
   form.appendChild(question(d.handednessLabel, hand.wrap));
   form.appendChild(question(d.inputDeviceLabel, device.wrap));
   box.appendChild(form);

   // Wrong-device note (shown when a non-trackpad device is selected)
   const note = el("p", "note", d.deviceBlockedNote);
   note.hidden = true;
   box.appendChild(note);

   // Consent checkbox
   const consentRow = el("label", "consent-row");
   const consent = el("input");
   consent.type = "checkbox";
   consentRow.appendChild(consent);
   consentRow.appendChild(el("span", null, d.consentLabel));
   box.appendChild(consentRow);

   const actions = el("div", "form-actions");
   const back = el("button", "btn btn-ghost", d.back);
   back.addEventListener("click", () => onBack && onBack());
   const btn = el("button", "btn", d.submit);
   btn.disabled = true;
   actions.appendChild(back);
   actions.appendChild(btn);
   box.appendChild(actions);
   overlay.appendChild(box);

   // Enable start only when all fields are answered,
   // the device matches and consent is checked.
   function updateStartState() {
      const dev = device.value();
      const answered =
         age.value !== "" &&
         gender.value() !== null &&
         hand.value() !== null &&
         dev === d.requiredInputDevice &&
         consent.checked;
      btn.disabled = !answered;
      note.hidden = !(dev !== null && dev !== d.requiredInputDevice);
   }

   box.addEventListener("change", updateStartState);
   box.addEventListener("input", updateStartState);
   updateStartState();

   btn.addEventListener("click", () => {
      if (btn.disabled) return;
      btn.disabled = true;
      onSubmit({
         age: age.value === "" ? null : parseInt(age.value, 10),
         sex: gender.value(),
         handedness: hand.value(),
      });
   });
}

export function renderPhaseIntro(overlay, phase, onContinue) {
   const t = texts.phaseIntro[phase];
   card(overlay, {
      title: t.title,
      paragraphs: [t.body],
      buttonLabel: texts.continueButton,
      onContinue,
      hint: texts.continueHint,
   });
}

export function renderSurvey(overlay, onSubmit) {
   clear(overlay);
   const s = texts.survey;
   const box = el("div", "card");
   box.appendChild(el("h1", "card-title", s.title));
   if (s.body) box.appendChild(el("p", "card-body", s.body));

   const form = el("div", "form");
   const groups = [];

   for (const item of s.items) {
      const group = el("div", "form-group");
      group.appendChild(el("p", "form-question", item.text));

      const scale = el("div", "scale");
      scale.appendChild(el("span", "scale-anchor", s.lowAnchor));

      const inputs = [];
      for (let i = 1; i <= s.scalePoints; i++) {
         const point = el("label", "scale-point");
         const input = el("input");
         input.type = "radio";
         input.name = "survey-" + item.id;
         input.value = String(i);
         point.appendChild(input);
         point.appendChild(el("span", "scale-num", String(i)));
         scale.appendChild(point);
         inputs.push(input);
      }

      scale.appendChild(el("span", "scale-anchor", s.highAnchor));
      group.appendChild(scale);
      form.appendChild(group);

      groups.push({
         id: item.id,
         value: () => {
            const hit = inputs.find((x) => x.checked);
            return hit ? parseInt(hit.value, 10) : null;
         },
      });
   }
   box.appendChild(form);

   const btn = el("button", "btn", s.submit);
   btn.disabled = true;
   box.appendChild(btn);
   overlay.appendChild(box);

   function update() {
      btn.disabled = !groups.every((g) => g.value() !== null);
   }
   box.addEventListener("change", update);
   update();

   btn.addEventListener("click", () => {
      if (btn.disabled) return;
      btn.disabled = true;
      const responses = {};
      for (const g of groups) responses[g.id] = g.value();
      onSubmit(responses);
   });
}

export function renderBreak(overlay, { remaining }, onContinue) {
   card(overlay, {
      title: texts.breakTitle,
      paragraphs: [
         texts.breakBody,
         remaining != null ? texts.remaining(remaining) : "",
      ].filter(Boolean),
      buttonLabel: "Continue",
      onContinue,
      hint: texts.continueHint,
   });
}

export function renderFullscreenGuard(overlay, { blockRestart }, onContinue) {
   card(overlay, {
      title: texts.fullscreen.title,
      paragraphs: [
         texts.fullscreen.body,
         blockRestart ? texts.fullscreen.restartNote : "",
      ].filter(Boolean),
      buttonLabel: texts.fullscreen.button,
      onContinue,
      hint: texts.continueHint,
   });
}

export function renderEnd(overlay, { status, onRetry }) {
   const u = texts.upload;
   if (status === "error") {
      card(overlay, {
         title: u.errorTitle,
         paragraphs: [u.errorBody],
         buttonLabel: u.retryButton,
         onContinue: onRetry,
      });
      return;
   }

   card(overlay, {
      title: texts.endTitle,
      paragraphs: [texts.endBody, status === "done" ? u.done : u.pending],
   });
}

// Small progress HUD shown during trials
export function setHud(hudEl, { blockIndex, totalBlocks, index, total }) {
   if (!hudEl) return;
   hudEl.textContent =
      `block ${blockIndex + 1}/${totalBlocks} • condition ${index + 1}/${total}`;
}

export function clearHud(hudEl) {
   if (hudEl) hudEl.textContent = "";
}
