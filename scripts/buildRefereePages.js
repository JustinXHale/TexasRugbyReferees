// scripts/buildRefereePages.js
import fs from "fs";
import path from "path";

const dataDir = path.resolve("./data");
const outDir = path.resolve("./referees");

// Helper to create a slug from name or email
const slugify = (str) =>
  str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

// Load all JSON files
const files = fs.readdirSync(dataDir).filter((f) => f.endsWith(".json"));
const reports = files
  .map((file) => {
    const raw = fs.readFileSync(path.join(dataDir, file), "utf8");
    try {
      const json = JSON.parse(raw);
      json.__filename = file;
      return json;
    } catch (err) {
      console.error(`❌ Error parsing ${file}:`, err);
      return null;
    }
  })
  .filter(Boolean);

// Group by referee email or name
const grouped = {};
for (const r of reports) {
  let refField = r["Referee Name"] || "Unknown Referee";
  let email = r["Email Address"] || "Unknown Email";
  let name = refField.trim();

  // If name contains "(email)", split cleanly
  const match = refField.match(/^(.*?)\s*\(([^)]+)\)$/);
  if (match) {
    name = match[1].trim();
    email = match[2].trim();
  }

  const slug = slugify(email || name);
  if (!grouped[slug]) grouped[slug] = { name, email, entries: [] };
  grouped[slug].entries.push(r);
}

// Ensure output dir exists
fs.mkdirSync(outDir, { recursive: true });

// Generate Markdown pages
for (const [slug, refData] of Object.entries(grouped)) {
  const { name, email, entries } = refData;

  let md = `---\n`;
  md += `title: ${name}\n`;
  md += `email: ${email}\n`;
  md += `---\n\n`;

  md += `# ${name}\n`;
  md += `📧 [${email}](mailto:${email})\n`;
  md += `_Last updated: ${new Date().toISOString().split("T")[0]}_\n\n`;
  md += `### 🏉 Recent Reports\n`;

  entries
    .sort((a, b) => new Date(b["Date"]) - new Date(a["Date"]))
    .forEach((r) => {
      const date = r["Date"] || "Unknown Date";
      const matchLevel = r["Match Level"] || "Unknown Level";
      const matchType = r["Match Type"] || "Unknown Type";
      const fileLink = `../../data/${r.__filename}`;

      md += `- **${date}** — ${matchLevel} (${matchType})  \n`;
      md += `  [View JSON report](${fileLink})\n`;
    });

  fs.writeFileSync(path.join(outDir, `${slug}.md`), md);
  console.log(`✅ Built referee page: ${slug}.md`);
}

console.log("🎯 All referee pages generated successfully!");
