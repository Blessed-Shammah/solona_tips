#!/usr/bin/env node
// CLI: generate an AI blog draft.
//   npm run blog:generate -- "How agents will buy compute"
// Produces content/blog/<slug>.md with reviewed:false. A human reviews, fact-checks, and sets
// reviewed:true to publish.
import { generatePost } from "../src/lib/blog/generate.mjs";

const topic = process.argv.slice(2).join(" ").trim();
if (!topic) {
  console.error('Usage: npm run blog:generate -- "your topic"');
  process.exit(1);
}

try {
  console.log(`Researching + drafting: "${topic}" …`);
  const { slug, path, title } = await generatePost(topic);
  console.log(`\n✓ Draft written: ${path}`);
  console.log(`  Title: ${title}`);
  console.log(`  Slug:  /blog/${slug}`);
  console.log(`\n  ⚠ It is marked reviewed:false. Fact-check it, then set reviewed:true to publish.`);
} catch (e) {
  console.error(`\n✗ ${e.message}`);
  process.exit(1);
}
