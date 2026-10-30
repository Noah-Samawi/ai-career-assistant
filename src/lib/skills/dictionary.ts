import { normalize } from "@/lib/text";

/**
 * Canonical skill name -> aliases (normalized match). Used for heuristic CV parsing,
 * job-requirement detection and the cover-letter claim check.
 * Extend freely; keep canonical names human-readable.
 */
export const SKILLS: Record<string, string[]> = {
  // Programming languages
  JavaScript: ["javascript", "js", "ecmascript"],
  TypeScript: ["typescript", "ts"],
  Python: ["python"],
  Java: ["java"],
  Kotlin: ["kotlin"],
  "C#": ["c#", "csharp", "c sharp"],
  "C++": ["c++", "cpp"],
  C: ["ansi c"],
  Go: ["golang", "go lang"],
  Rust: ["rust"],
  PHP: ["php"],
  Ruby: ["ruby"],
  Swift: ["swift"],
  Dart: ["dart"],
  Scala: ["scala"],
  R: ["r programming", "rstudio"],
  SQL: ["sql"],
  Bash: ["bash", "shell scripting", "shell"],
  PowerShell: ["powershell"],
  // Frontend
  React: ["react", "react.js", "reactjs"],
  "Next.js": ["next.js", "nextjs"],
  Vue: ["vue", "vue.js", "vuejs", "nuxt"],
  Angular: ["angular"],
  Svelte: ["svelte"],
  HTML: ["html", "html5"],
  CSS: ["css", "css3", "scss", "sass"],
  "Tailwind CSS": ["tailwind", "tailwindcss"],
  Redux: ["redux"],
  "React Native": ["react native"],
  Flutter: ["flutter"],
  // Backend
  "Node.js": ["node.js", "nodejs", "node"],
  Express: ["express", "express.js"],
  NestJS: ["nestjs", "nest.js"],
  Django: ["django"],
  Flask: ["flask"],
  FastAPI: ["fastapi"],
  Spring: ["spring", "spring boot", "springboot"],
  ".NET": [".net", "dotnet", "asp.net"],
  Laravel: ["laravel"],
  "Ruby on Rails": ["rails", "ruby on rails"],
  GraphQL: ["graphql"],
  "REST APIs": ["rest", "restful", "rest api", "rest apis"],
  Microservices: ["microservices", "microservice"],
  // Data / DB
  PostgreSQL: ["postgresql", "postgres"],
  MySQL: ["mysql", "mariadb"],
  MongoDB: ["mongodb", "mongo"],
  Redis: ["redis"],
  Elasticsearch: ["elasticsearch", "opensearch"],
  Supabase: ["supabase"],
  Firebase: ["firebase"],
  Kafka: ["kafka"],
  Spark: ["spark", "pyspark"],
  Pandas: ["pandas"],
  NumPy: ["numpy"],
  "Power BI": ["power bi", "powerbi"],
  Tableau: ["tableau"],
  "Data Analysis": ["data analysis", "datenanalyse", "data analytics"],
  ETL: ["etl"],
  // AI / ML
  "Machine Learning": ["machine learning", "ml", "maschinelles lernen"],
  "Deep Learning": ["deep learning"],
  PyTorch: ["pytorch"],
  TensorFlow: ["tensorflow"],
  "scikit-learn": ["scikit-learn", "sklearn"],
  LLMs: ["llm", "llms", "large language models", "genai", "generative ai", "generative ki"],
  "OpenAI API": ["openai", "openai api", "chatgpt api"],
  LangChain: ["langchain"],
  RAG: ["rag", "retrieval augmented generation"],
  NLP: ["nlp", "natural language processing"],
  "Computer Vision": ["computer vision"],
  // Cloud / DevOps
  AWS: ["aws", "amazon web services"],
  Azure: ["azure", "microsoft azure"],
  GCP: ["gcp", "google cloud"],
  Docker: ["docker"],
  Kubernetes: ["kubernetes", "k8s"],
  Terraform: ["terraform"],
  Ansible: ["ansible"],
  "CI/CD": ["ci/cd", "cicd", "continuous integration", "github actions", "gitlab ci", "jenkins"],
  Git: ["git", "github", "gitlab"],
  Linux: ["linux", "ubuntu", "debian", "red hat", "rhel"],
  "Windows Server": ["windows server"],
  "Active Directory": ["active directory", "entra id", "azure ad"],
  Networking: ["networking", "netzwerk", "netzwerktechnik", "tcp/ip", "dns", "dhcp", "vpn"],
  "IT Security": ["it security", "it-sicherheit", "cybersecurity", "cyber security", "informationssicherheit", "security"],
  SIEM: ["siem", "splunk", "wazuh", "sentinel"],
  ITIL: ["itil"],
  "IT Support": ["it support", "it-support", "helpdesk", "help desk", "service desk", "1st level", "2nd level", "first level", "second level"],
  "Microsoft 365": ["microsoft 365", "office 365", "m365"],
  Intune: ["intune"],
  VMware: ["vmware", "vsphere"],
  // Practices / tools
  Agile: ["agile", "agil"],
  Scrum: ["scrum"],
  Kanban: ["kanban"],
  Jira: ["jira"],
  Confluence: ["confluence"],
  "UX Design": ["ux", "ux design", "user experience"],
  "UI Design": ["ui design", "user interface"],
  Figma: ["figma"],
  "Adobe Photoshop": ["photoshop"],
  "Adobe Illustrator": ["illustrator"],
  Testing: ["unit testing", "testautomatisierung", "test automation", "jest", "vitest", "cypress", "playwright", "selenium"],
  SEO: ["seo", "suchmaschinenoptimierung"],
  WordPress: ["wordpress"],
  Shopify: ["shopify"],
  // Business
  SAP: ["sap", "sap s/4hana", "s/4hana"],
  Excel: ["excel", "ms excel"],
  Salesforce: ["salesforce"],
  HubSpot: ["hubspot"],
  "Project Management": ["project management", "projektmanagement", "pmp", "prince2"],
  "Product Management": ["product management", "produktmanagement", "product owner"],
  Accounting: ["accounting", "buchhaltung", "finanzbuchhaltung", "datev"],
  Controlling: ["controlling"],
  Sales: ["sales", "vertrieb"],
  Marketing: ["marketing", "online marketing", "digital marketing"],
  "Customer Service": ["customer service", "kundenservice", "kundenbetreuung", "customer support"],
  Recruiting: ["recruiting", "talent acquisition"],
  "Supply Chain": ["supply chain", "logistik", "logistics"],
  Teaching: ["teaching", "unterricht", "lehre", "tutoring", "nachhilfe"],
  Nursing: ["pflege", "nursing", "krankenpflege"],
  "Driving License B": ["fuhrerschein klasse b", "fuhrerschein b", "driving license"],
  Communication: ["communication skills", "kommunikationsfahigkeit", "kommunikationsstark"],
  Leadership: ["leadership", "fuhrungserfahrung", "team lead", "teamleitung"],
};

type Entry = { canonical: string; alias: string; re: RegExp };

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const ENTRIES: Entry[] = Object.entries(SKILLS).flatMap(([canonical, aliases]) =>
  [normalize(canonical), ...aliases.map(normalize)].map((alias) => ({
    canonical,
    alias,
    // word-ish boundaries that also work for "c++", "c#", ".net", "node.js"
    re: new RegExp(`(^|[^a-z0-9+#])${escapeRe(alias)}(?=$|[^a-z0-9+#])`, "i"),
  })),
);

// Aliases that are too ambiguous as single tokens in free text.
const AMBIGUOUS = new Set(["go", "r", "c", "rest", "node", "security", "shell", "ml", "ux", "ts", "js", "spring", "express", "flask", "swift", "dart"]);

/** Detects canonical skills in free text. `strict` skips ambiguous short aliases unless explicitly listed. */
export function detectSkills(text: string, opts: { strict?: boolean } = {}): string[] {
  const hay = normalize(text);
  const found = new Set<string>();
  for (const e of ENTRIES) {
    if (opts.strict && AMBIGUOUS.has(e.alias)) continue;
    if (e.re.test(hay)) found.add(e.canonical);
  }
  return [...found];
}

/** Maps a user-entered skill to its canonical name (or returns it trimmed). */
export function canonicalSkill(input: string): string {
  const n = normalize(input);
  for (const e of ENTRIES) if (e.alias === n) return e.canonical;
  return input.trim();
}

/** Lowercased set of all aliases for a canonical or custom skill – used for matching. */
export function aliasesFor(skill: string): string[] {
  const canonical = canonicalSkill(skill);
  const al = SKILLS[canonical];
  return al ? [normalize(canonical), ...al.map(normalize)] : [normalize(skill)];
}
