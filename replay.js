"use strict";

const addMarks = (container, count, classify) => {
  const marks = document.createDocumentFragment();
  for (let index = 0; index < count; index++) {
    const mark = document.createElement("i");
    mark.className = classify(index);
    marks.append(mark);
  }
  container.append(marks);
};

addMarks(document.querySelector("#people-marks"), 119, index => {
  if (index < 44) return "child";
  return index === 44 ? "split" : "";
});
addMarks(document.querySelector("#tasqyn-marks"), 16, index => index < 9 ? "has-forecast" : "");

const river = document.querySelector("#river");
const riverContext = river.getContext("2d");

function drawRiver() {
  if (!riverContext) return;
  const c = riverContext;
  const path = new Path2D("M 458 -58 C 448 28 397 47 398 105 C 398 187 278 163 278 235 C 279 306 469 233 461 323 C 453 409 337 375 325 456 C 319 486 298 517 269 551");

  c.clearRect(0, 0, 680, 500);
  c.strokeStyle = "#537b6340";
  c.lineWidth = 1;
  for (let x = 20; x < 680; x += 36) {
    c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 500); c.stroke();
  }
  for (let y = 22; y < 500; y += 36) {
    c.beginPath(); c.moveTo(0, y); c.lineTo(680, y); c.stroke();
  }

  const contours = [
    { x: 114, y: 132, seed: .7, count: 8 },
    { x: 565, y: 354, seed: 2.1, count: 11 },
    { x: 97, y: 432, seed: .4, count: 7 },
    { x: 632, y: 53, seed: 2.4, count: 9 },
  ];
  c.strokeStyle = "#74a08174";
  for (const contour of contours) {
    for (let ring = 1; ring <= contour.count; ring++) {
      c.beginPath();
      for (let index = 0; index <= 100; index++) {
        const angle = index / 100 * Math.PI * 2;
        const radius = (ring * 14 + 12) * (1 + .14 * Math.sin(angle * 3 + contour.seed) + .11 * Math.cos(angle * 5 + ring * .24));
        const x = contour.x + Math.cos(angle) * radius * 1.24;
        const y = contour.y + Math.sin(angle) * radius * .73;
        if (index === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.stroke();
    }
  }

  c.lineCap = "round";
  for (const [width, colour] of [[80, "#2f5848"], [73, "#213c31"], [46, "#43826d"], [40, "#275b4e"], [30, "#3d8b77"], [17, "#64b69d"], [5, "#a3dfc5"]]) {
    c.lineWidth = width;
    c.strokeStyle = colour;
    c.stroke(path);
  }
  c.lineWidth = 2;
  c.setLineDash([3, 11]);
  c.strokeStyle = "#f2fff3";
  c.stroke(path);
  c.setLineDash([]);

  c.beginPath();
  c.moveTo(185, 340); c.lineTo(329, 281); c.lineTo(402, 283); c.lineTo(520, 340);
  c.strokeStyle = "#ffc093";
  c.lineWidth = 2;
  c.stroke();
  for (const [x, y, colour] of [[398, 105, "#9ce6ca"], [330, 281, "#ffc093"], [520, 340, "#9ce6ca"]]) {
    c.beginPath(); c.arc(x, y, 12, 0, Math.PI * 2); c.fillStyle = "#10231b"; c.fill();
    c.strokeStyle = colour; c.stroke();
    c.beginPath(); c.arc(x, y, 4, 0, Math.PI * 2); c.fillStyle = colour; c.fill();
  }
}

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const reviewLevel = 4;
const scenes = [
  {
    observed: 2.5, official: [2.9, 3.5, 3.8], ai: [3.2, 4.2, 4.6], stage: "Compare forecasts",
    regular: ["Keep monitoring", "Official guidance stays below the crossing review level. The coordinator keeps the routine review schedule.", "Scheduled · Duty hydrologist", "Review the next gauge update on Tuesday."],
    assisted: ["Check the backup vehicle today", "The AI run crosses the review level by Wednesday. The hydrologist reviews the disagreement. The coordinator approves a reversible check while uncertainty remains.", "Assigned · Transport lead", "Confirm a backup vehicle and driver by the end of Monday."],
  },
  {
    observed: 3.3, official: [4.1, 4.5, 3.7], ai: [4.4, 4.7, 3.6], stage: "Prepare",
    regular: ["Start the transport check", "Official guidance now crosses the review level. The coordinator asks the transport lead to confirm a vehicle and an alternate route.", "Blocked · Transport lead", "The first vehicle is unavailable. Request a replacement and set a confirmation deadline."],
    assisted: ["Use the checked backup", "Official guidance now crosses the review level. Yesterday’s check found the first vehicle unavailable. The coordinator authorizes staging the replacement on higher ground.", "Confirmed · Transport lead", "The replacement vehicle and driver are available. The route still needs a field check."],
  },
  {
    observed: 4.2, official: [4.7, 3.8, 3.2], ai: [4.6, 3.6, 3.1], stage: "Verify access",
    regular: ["Confirm access and a replacement", "The gauge passes the review level. A field team reports water over the low crossing. The coordinator uses the verified alternate route and authorized communications.", "Confirmed late · Transport lead", "The replacement vehicle is now available at the staging point."],
    assisted: ["Switch to the verified route", "The gauge passes the review level. A field team reports water over the low crossing. The coordinator uses the verified alternate route and authorized communications.", "Ready · Transport lead", "Use the staged vehicle. Confirm the local contact received the route update."],
  },
  {
    observed: 4.4, official: [3.6, 3.2], ai: null, stage: "Use the fallback",
    regular: ["Keep preparations in place", "Official guidance suggests a decline on Friday. The coordinator keeps the alternate route in use while the duty officer requests another field check.", "Pending · Field team", "Verify road access and record the result before standing down."],
    assisted: ["Keep preparations in place", "The supplemental feed is unavailable. The team uses official guidance and field reports. A forecast of falling water prompts another check at the crossing.", "Fallback · Duty hydrologist", "Log the outage. The field team verifies road access before the coordinator stands down."],
  },
];

const plot = document.querySelector("#forecast");
const plotContext = plot.getContext("2d");
const byId = name => document.getElementById(name);
const stepButtons = Array.from(document.querySelectorAll("[data-step]"));
const modeButtons = document.querySelectorAll("[name='mode']");
let day = 0;
let showAi = false;

function formatStage(value) {
  return `${value.toFixed(1)} m`;
}

function forecastDescription(scene, label, values) {
  if (!values) return `${label} is unavailable.`;
  const crossingIndex = values.findIndex(value => value >= reviewLevel);
  if (scene.observed >= reviewLevel) {
    const fallIndex = values.findIndex(value => value < reviewLevel);
    return fallIndex === -1 ? `${label} stays above the review level.` : `${label} falls below the review level on ${days[day + fallIndex + 1]}.`;
  }
  return crossingIndex === -1 ? `${label} stays below the review level.` : `${label} reaches the review level by ${days[day + crossingIndex + 1]}.`;
}

function drawForecast() {
  if (!plotContext) return;
  const { width, height } = plot.getBoundingClientRect();
  if (!width || !height) return;

  const density = window.devicePixelRatio || 1;
  plot.width = Math.round(width * density);
  plot.height = Math.round(height * density);
  const c = plotContext;
  c.setTransform(density, 0, 0, density, 0, 0);

  const left = 36;
  const top = 15;
  const bottom = height - 29;
  const chartWidth = width - left - 16;
  const x = index => left + index * chartWidth / (days.length - 1);
  const y = level => bottom - (level - 2) * (bottom - top) / 3;
  c.font = "11px system-ui, sans-serif";
  c.fillStyle = "#bed0c5";
  c.lineWidth = 1;
  c.textAlign = "right";
  c.textBaseline = "middle";
  for (const level of [2, 3, 4, 5]) {
    c.fillText(`${level} m`, left - 6, y(level));
    c.strokeStyle = level === reviewLevel ? "#b9a7df" : "#426154";
    c.setLineDash(level === reviewLevel ? [2, 4] : []);
    c.beginPath(); c.moveTo(left, y(level)); c.lineTo(x(days.length - 1), y(level)); c.stroke();
  }
  c.setLineDash([3, 4]);
  c.strokeStyle = "#769887";
  c.beginPath(); c.moveTo(x(day), top); c.lineTo(x(day), bottom); c.stroke();
  c.textAlign = "center";
  days.forEach((label, index) => c.fillText(label.slice(0, 3), x(index), height - 12));

  function series(start, values, colour, dash, observed) {
    c.strokeStyle = colour;
    c.fillStyle = colour;
    c.lineWidth = 2.5;
    c.setLineDash(dash);
    c.beginPath();
    values.forEach((value, index) => {
      if (index === 0) c.moveTo(x(start + index), y(value));
      else c.lineTo(x(start + index), y(value));
    });
    c.stroke();
    c.setLineDash([]);
    values.forEach((value, index) => {
      if (!observed && index === 0) return;
      c.beginPath(); c.arc(x(start + index), y(value), observed ? 3.8 : 2.8, 0, Math.PI * 2); c.fill();
    });
  }

  const scene = scenes[day];
  series(day, [scene.observed, ...scene.official], "#dde9df", [8, 5], false);
  if (showAi && scene.ai) series(day, [scene.observed, ...scene.ai], "#ffc093", [3, 3], false);
  series(0, scenes.slice(0, day + 1).map(item => item.observed), "#8ee0c2", [], true);
}

function render() {
  const scene = scenes[day];
  const action = showAi ? scene.assisted : scene.regular;
  byId("chart-time").textContent = days[day];
  byId("stage-label").textContent = `${days[day]} · ${scene.stage}`;
  ["decision-title", "decision-detail", "task-label", "task-detail"].forEach((id, index) => {
    byId(id).textContent = action[index];
  });

  const description = [
    `Observed on ${days[day]}: ${formatStage(scene.observed)}. Illustrated review level: ${formatStage(reviewLevel)}.`,
    forecastDescription(scene, "Official forecast", scene.official),
  ];
  if (showAi) description.push(forecastDescription(scene, "AI forecast", scene.ai));
  byId("chart-description").textContent = description.join(" ");
  byId("ai-key").hidden = !showAi || !scene.ai;
  byId("prev").disabled = day === 0;
  byId("next").disabled = day === scenes.length - 1;
  stepButtons.forEach((button, index) => {
    if (index === day) button.setAttribute("aria-current", "step");
    else button.removeAttribute("aria-current");
  });
  drawForecast();
}

function selectDay(nextDay, usingArrowButton = false) {
  day = nextDay;
  render();
  if (usingArrowButton && (day === 0 || day === scenes.length - 1)) stepButtons[day].focus();
}

modeButtons.forEach(button => button.addEventListener("change", event => {
  showAi = event.target.value === "ai";
  render();
}));
stepButtons.forEach(button => button.addEventListener("click", () => selectDay(Number(button.dataset.step))));
byId("prev").addEventListener("click", () => selectDay(day - 1, true));
byId("next").addEventListener("click", () => selectDay(day + 1, true));

drawRiver();
render();
new ResizeObserver(drawForecast).observe(plot);
