import fs from "node:fs/promises";
import path from "node:path";
import { Presentation } from "@oai/artifact-tool";

const workspace = "/Users/arhamshomefolder/ava-community-intelligence";
const outputDir = path.join(workspace, "deck-png");
const buildDir = path.join(workspace, ".build/deck-image");
const W = 1920;
const H = 1080;
const FONT = "DM Sans";
const INK = "#111111";
const PAPER = "#FFFFFF";
const HAIR = "#E5E5E5";
const ACCENT = "#1B3A8F";
const SLIDE_COUNT = 15;

await fs.mkdir(outputDir, { recursive: true });
await fs.mkdir(buildDir, { recursive: true });

const deck = Presentation.create({ slideSize: { width: W, height: H } });

function box(slide, { x, y, w, h, fill = "none", line = "none", radius = 0 }) {
  return slide.shapes.add({
    geometry: "rect",
    position: { left: x, top: y, width: w, height: h },
    fill,
    line: line === "none" ? { fill: "none", width: 0 } : { style: "solid", fill: line, width: 1 },
    ...(radius ? { borderRadius: radius } : {}),
  });
}

function rule(slide, x, y, w, h = 0, color = HAIR, width = 1) {
  return slide.shapes.add({
    geometry: "line",
    position: { left: x, top: y, width: w, height: h },
    fill: "none",
    line: { style: "solid", fill: color, width },
  });
}

function text(slide, value, { x, y, w, h, size = 32, weight = 400, align = "left", valign = "top", color = INK }) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    position: { left: x, top: y, width: w, height: h },
    fill: "none",
    line: { fill: "none", width: 0 },
  });
  shape.text = value;
  shape.text.style = {
    typeface: FONT,
    fontSize: size,
    bold: weight === 600,
    color,
    alignment: align,
    verticalAlignment: valign,
    autoFit: "none",
    wrap: "square",
    insets: { top: 0, right: 0, bottom: 0, left: 0 },
  };
  return shape;
}

async function image(slide, file, { x, y, w, h, fit = "cover", crop }) {
  const bytes = await fs.readFile(path.join(workspace, file));
  return slide.images.add({
    blob: bytes,
    contentType: "image/png",
    alt: path.basename(file),
    fit,
    position: { left: x, top: y, width: w, height: h },
    ...(crop ? { crop } : {}),
  });
}

function newSlide() {
  const slide = deck.slides.add();
  slide.background.fill = PAPER;
  return slide;
}

function headline(slide, value, y = 120, h = 180) {
  return text(slide, value, { x: 120, y, w: 1680, h, size: 72, weight: 600 });
}

function chrome(slide, index) {
  const startX = 120;
  for (let i = 0; i < SLIDE_COUNT; i += 1) {
    slide.shapes.add({
      geometry: "ellipse",
      position: { left: startX + i * 22, top: 1011, width: 8, height: 8 },
      fill: i === index ? ACCENT : HAIR,
      line: { fill: "none", width: 0 },
    });
  }
  text(slide, `${index + 1} / ${SLIDE_COUNT}`, { x: 1680, y: 995, w: 120, h: 32, size: 20, align: "right" });
}

// 1 — title
{
  const s = newSlide();
  text(s, "Accelerator Project: ReliAdapt (Planetary Intelligence)", { x: 120, y: 270, w: 1200, h: 40, size: 20 });
  text(s, "Spatial Intelligence for Empowering\nCommunity-Capacity Co-Benefit", { x: 120, y: 340, w: 1580, h: 210, size: 72, weight: 600 });
  rule(s, 120, 640, 1680);
  text(s, "PI: Ram Rajagopal", { x: 120, y: 680, w: 520, h: 40, size: 24 });
  text(s, "SME: Yue Tu", { x: 780, y: 680, w: 420, h: 40, size: 24 });
  text(s, "Team: Samuel Bobick, Arham Shah, Chad Zanocco, Tony Liu, Claire Petersen, Tao Sun, June Flora", { x: 120, y: 750, w: 1560, h: 80, size: 24 });
  chrome(s, 0);
}

// 2 — executive summary
{
  const s = newSlide();
  headline(s, "Executive Summary");
  text(s, "Our spatial intelligence platform helps host communities identify local needs, prioritize building-level grid investments, and ensure data center development delivers visible resident benefits and additional grid capacity.", { x: 120, y: 300, w: 1640, h: 170, size: 32 });
  const labels = ["Data center\ncandidate communities", "Spatial\nintelligence tool", "Community needs\nassessment"];
  const cardX = [120, 740, 1360];
  for (let i = 0; i < 3; i += 1) {
    box(s, { x: cardX[i], y: 560, w: 440, h: 200, fill: PAPER, line: i === 1 ? INK : HAIR });
    text(s, labels[i], { x: cardX[i] + 24, y: 600, w: 392, h: 120, size: 32, weight: i === 1 ? 600 : 400, align: "center" });
    if (i < 2) {
      s.shapes.add({
        geometry: "rightArrow",
        position: { left: cardX[i] + 485, top: 642, width: 90, height: 32 },
        fill: INK,
        line: { fill: "none", width: 0 },
      });
    }
  }
  chrome(s, 1);
}

// 3 — 3Cs
{
  const s = newSlide();
  headline(s, "Data Center Development Requires 3C’s");
  s.shapes.add({
    geometry: "triangle",
    position: { left: 450, top: 330, width: 1020, height: 430 },
    fill: PAPER,
    line: { style: "solid", fill: INK, width: 2 },
  });
  box(s, { x: 760, y: 270, w: 400, h: 105, fill: PAPER });
  text(s, "Compute", { x: 760, y: 282, w: 400, h: 90, size: 72, weight: 600, align: "center" });
  box(s, { x: 250, y: 710, w: 400, h: 105, fill: PAPER });
  text(s, "Cost", { x: 250, y: 722, w: 400, h: 90, size: 72, weight: 600, align: "center" });
  box(s, { x: 1270, y: 710, w: 400, h: 105, fill: PAPER });
  text(s, "Community", { x: 1240, y: 722, w: 460, h: 90, size: 72, weight: 600, align: "center" });
  chrome(s, 2);
}

// 4 — problem
{
  const s = newSlide();
  headline(s, "Problem: Americans Oppose Data Centers");
  text(s, "Data center development requires 3C’s:\nCapacity, Cost, and Community", { x: 120, y: 300, w: 700, h: 120, size: 32 });
  text(s, "73%", { x: 120, y: 455, w: 330, h: 170, size: 140, weight: 600 });
  text(s, "of Americans oppose data centers\nin their community", { x: 120, y: 625, w: 720, h: 110, size: 32 });
  rule(s, 120, 770, 700);
  text(s, "Promises made by developers are often abstract, hard-to-believe, and measured in aggregate over the data center lifetime", { x: 120, y: 800, w: 700, h: 130, size: 24 });
  await image(s, "assets/protest.png", { x: 930, y: 280, w: 870, h: 650, fit: "cover" });
  chrome(s, 3);
}

// 5 — community imagery
{
  const s = newSlide();
  await image(s, "assets/community-protest.png", { x: 120, y: 120, w: 780, h: 430, fit: "cover" });
  await image(s, "assets/community-meeting.png", { x: 930, y: 120, w: 870, h: 430, fit: "cover" });
  await image(s, "assets/community-panel.png", { x: 120, y: 580, w: 1680, h: 370, fit: "cover" });
  chrome(s, 4);
}

// 6 — solution pillars
{
  const s = newSlide();
  headline(s, "Solution: Community Needs Tool");
  text(s, "Our tool helps communities understand how to benefit:", { x: 120, y: 300, w: 1500, h: 60, size: 32 });
  rule(s, 120, 500, 760);
  rule(s, 1040, 500, 760);
  text(s, "Community:", { x: 120, y: 540, w: 760, h: 90, size: 72, weight: 600 });
  text(s, "tangible benefits to homes, local businesses, and essential services", { x: 120, y: 680, w: 760, h: 150, size: 32 });
  text(s, "Capacity:", { x: 1040, y: 540, w: 760, h: 90, size: 72, weight: 600 });
  text(s, "strengthens grid resilience and capacity, benefitting the data centers that rely on it", { x: 1040, y: 680, w: 760, h: 150, size: 32 });
  chrome(s, 5);
}

// 7 — buyer and user
{
  const s = newSlide();
  headline(s, "Solution: Community Needs Tool");
  rule(s, 960, 330, 0, 540);
  text(s, "Who purchases the tool?", { x: 120, y: 390, w: 720, h: 100, size: 32, weight: 600 });
  text(s, "Data center developers purchase the tool as part of early siting assessments", { x: 120, y: 550, w: 700, h: 190, size: 32 });
  text(s, "Who uses the tool?", { x: 1080, y: 390, w: 720, h: 100, size: 32, weight: 600 });
  text(s, "Utilities, governments, and interest groups presenting needs and potential benefits to data center developers", { x: 1080, y: 550, w: 700, h: 210, size: 32 });
  chrome(s, 6);
}

// 8 — extraction pipeline I
{
  const s = newSlide();
  headline(s, "Technical Innovation: Information Extraction Pipeline", 90, 170);
  box(s, { x: 120, y: 280, w: 1680, h: 145, fill: PAPER, line: INK, radius: 8 });
  text(s, "Building permit", { x: 150, y: 300, w: 400, h: 34, size: 24, weight: 600 });
  text(s, "date 2025-09-17\naddress 123 Main St\ndescription main panel upgrade 200A & 2 new branch circuits, daikin hp 36k btu", { x: 150, y: 340, w: 1550, h: 80, size: 20 });
  const first = box(s, { x: 120, y: 520, w: 650, h: 350, fill: PAPER, line: HAIR });
  const second = box(s, { x: 1030, y: 520, w: 770, h: 350, fill: PAPER, line: HAIR });
  text(s, "Permit filtering", { x: 150, y: 550, w: 590, h: 44, size: 32, weight: 600 });
  text(s, "HVAC\nSolar\nEnergy storage\nCooking\nWater heater\nEV charger\nElectrical", { x: 150, y: 620, w: 590, h: 230, size: 24 });
  text(s, "Technology identification", { x: 1060, y: 550, w: 700, h: 44, size: 32, weight: 600 });
  text(s, "Q: Which distinct HVAC technologies?\nheat pump\n\nQ: Which distinct electrical technologies?\nmain panel\nbranch circuits", { x: 1060, y: 620, w: 700, h: 230, size: 24 });
  s.shapes.add({
    geometry: "rightArrow",
    position: { left: 810, top: 680, width: 170, height: 34 },
    fill: INK,
    line: { fill: "none", width: 0 },
  });
  chrome(s, 7);
}

// 9 — extraction pipeline II
{
  const s = newSlide();
  headline(s, "Technical Innovation: Information Extraction Pipeline", 90, 170);
  text(s, "Attribute extraction", { x: 120, y: 300, w: 720, h: 55, size: 32, weight: 600 });
  const blocks = [
    ["heat pump", "Q: What is the brand?\nbrand daikin\nQ: What is the capacity?\ncapacity 36000"],
    ["main panel", "Q: What is the amperage?\namps_new 200"],
    ["branch circuits", "Q: How many circuits?\ncircuits 2"],
  ];
  let y = 390;
  for (const [label, body] of blocks) {
    rule(s, 120, y, 720);
    text(s, label, { x: 120, y: y + 18, w: 260, h: 36, size: 24, weight: 600 });
    text(s, body, { x: 390, y: y + 18, w: 450, h: label === "heat pump" ? 150 : 90, size: 24 });
    y += label === "heat pump" ? 210 : 145;
  }
  rule(s, 960, 280, 0, 650);
  text(s, "Electrification space/time maps", { x: 1040, y: 300, w: 760, h: 55, size: 32, weight: 600 });
  await image(s, "assets/electrification-map.png", { x: 1140, y: 390, w: 560, h: 540, fit: "contain" });
  chrome(s, 8);
}

// 10 — technical innovation analysis
{
  const s = newSlide();
  headline(s, "Technical Innovation Analysis");
  const cols = [120, 1020];
  rule(s, cols[0], 360, 780);
  rule(s, cols[1], 360, 780);
  text(s, "Differentiation: currently unserved", { x: cols[0], y: 400, w: 760, h: 90, size: 32, weight: 600 });
  text(s, "Layers of intelligence using proprietary data spanning buildings, DERs, and electricity economics", { x: cols[0], y: 540, w: 760, h: 150, size: 24 });
  text(s, "No incumbent effectively empowers communities and data centers to understand co-benefits", { x: cols[0], y: 735, w: 760, h: 120, size: 24 });
  text(s, "Technical readiness: pilot stage", { x: cols[1], y: 400, w: 760, h: 90, size: 32, weight: 600 });
  text(s, "Conducting a research pilot with a California Community Choice Aggregator who is using this to improve electrification program outreach", { x: cols[1], y: 540, w: 760, h: 190, size: 24 });
  chrome(s, 9);
}

// 11 — economic readiness
{
  const s = newSlide();
  headline(s, "Economic Readiness and Feasibility");
  rule(s, 120, 360, 930);
  rule(s, 1170, 360, 630);
  text(s, "Economic readiness", { x: 120, y: 400, w: 900, h: 70, size: 32, weight: 600 });
  const econ = [
    "Software-only deployment with minimal initial expenditure",
    "Building permits are public record (free)",
    "Small, open-weight LLMs (Google Gemma 4) enable scalable low-cost inference",
  ];
  econ.forEach((item, i) => {
    text(s, item, { x: 120, y: 515 + i * 125, w: 900, h: 90, size: 24 });
    rule(s, 120, 600 + i * 125, 900);
  });
  text(s, "Market scalability", { x: 1170, y: 400, w: 600, h: 70, size: 32, weight: 600 });
  text(s, "Nationwide dataset exists and is ready to scale to other markets and technologies (e.g., construction, water)", { x: 1170, y: 515, w: 600, h: 180, size: 24 });
  chrome(s, 10);
}

// 12 — co-benefits
{
  const s = newSlide();
  headline(s, "Community and Data Center Co-Benefits", 70, 100);
  const cards = [
    { label: "Capacity", asset: "assets/benefit-capacity.png", x: 120, y: 230, w: 800, h: 250 },
    { label: "Decarbonization", asset: "assets/benefit-decarbonization.png", x: 1000, y: 230, w: 800, h: 250 },
    { label: "Reliability", asset: "assets/benefit-reliability.png", x: 120, y: 565, w: 500, h: 240 },
    { label: "Affordability", asset: "assets/benefit-affordability.png", x: 710, y: 565, w: 500, h: 240 },
    { label: "Health", asset: "assets/benefit-health.png", x: 1300, y: 565, w: 500, h: 240 },
  ];
  for (const card of cards) {
    box(s, { x: card.x, y: card.y, w: card.w, h: card.h + 90, fill: PAPER, line: HAIR });
    await image(s, card.asset, { x: card.x + 12, y: card.y + 12, w: card.w - 24, h: card.h - 24, fit: "contain" });
    text(s, card.label, { x: card.x + 24, y: card.y + card.h + 14, w: card.w - 48, h: 58, size: 48, weight: 600 });
  }
  chrome(s, 11);
}

// 13 — scale-up path
{
  const s = newSlide();
  headline(s, "Scale-Up Path");
  text(s, "Implementation steps", { x: 120, y: 320, w: 700, h: 60, size: 32, weight: 600 });
  rule(s, 160, 550, 1420, 0, INK, 2);
  slideDot(s, 160, 550);
  slideDot(s, 1580, 550);
  text(s, "Evaluate pilot with Community Choice Aggregator", { x: 120, y: 430, w: 620, h: 90, size: 32 });
  text(s, "Engage with pilot data center candidate communities (focus on muni/co-op/CCA/TVA)", { x: 1050, y: 410, w: 750, h: 120, size: 32, align: "right" });
  const strategies = ["“Blue ocean”", "Capture the market share with a low-cost model", "“Volume play” / “network effects”"];
  strategies.forEach((item, i) => {
    const x = 520 + i * 410;
    rule(s, x, 550, 0, 110, HAIR);
    text(s, item, { x: x - 150, y: 690, w: 300, h: 120, size: 24, align: "center" });
  });
  chrome(s, 12);
}

// 14 — scale-up statement
{
  const s = newSlide();
  headline(s, "Scale-Up Path");
  text(s, "Implementation steps", { x: 120, y: 360, w: 600, h: 40, size: 20 });
  text(s, "Integrate other levels of intelligence, e.g., connecting with installers", { x: 120, y: 450, w: 1500, h: 240, size: 72, weight: 600 });
  chrome(s, 13);
}

// 15 — risk barriers
{
  const s = newSlide();
  headline(s, "Scale-Up Path");
  text(s, "Key risk barriers", { x: 120, y: 330, w: 700, h: 60, size: 32, weight: 600 });
  rule(s, 120, 470, 760);
  rule(s, 1040, 470, 760);
  text(s, "Utility industry is risk-averse and hesitant to try new tools", { x: 120, y: 530, w: 760, h: 190, size: 32 });
  text(s, "Need to establish a value proposition for an investor-owned utility?", { x: 1040, y: 530, w: 760, h: 190, size: 32 });
  chrome(s, 14);
}

function slideDot(slide, x, y) {
  slide.shapes.add({
    geometry: "ellipse",
    position: { left: x - 9, top: y - 9, width: 18, height: 18 },
    fill: ACCENT,
    line: { fill: "none", width: 0 },
  });
}

for (let i = 0; i < deck.slides.items.length; i += 1) {
  const slide = deck.slides.items[i];
  const preview = await deck.export({ slide, format: "png", scale: 1 });
  const filename = `slide-${String(i + 1).padStart(2, "0")}.png`;
  await fs.writeFile(path.join(outputDir, filename), new Uint8Array(await preview.arrayBuffer()));
}

console.log(JSON.stringify({ slides: deck.slides.items.length, outputDir }));
