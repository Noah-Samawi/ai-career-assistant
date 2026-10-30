import { describe, expect, it } from "vitest";
import { dedupeHash, normalizeCompany } from "@/lib/jobs/dedupe";
import { detectLanguage, htmlToText } from "@/lib/text";
import { detectSkills } from "@/lib/skills/dictionary";
import { findUnsupportedSkills } from "@/lib/applications/claims";

describe("dedupe", () => {
  it("treats the same posting on two sources as one", () => {
    const a = dedupeHash({ company: "ACME GmbH", title: "Backend Developer (m/w/d)", location: "60311 Frankfurt am Main", remote: false });
    const b = dedupeHash({ company: "Acme", title: "Backend Developer", location: "Frankfurt am Main, Hessen", remote: false });
    expect(a).toBe(b);
  });
  it("keeps different cities apart", () => {
    expect(dedupeHash({ company: "Acme", title: "Dev", location: "Berlin", remote: false })).not.toBe(
      dedupeHash({ company: "Acme", title: "Dev", location: "München", remote: false }),
    );
  });
  it("strips legal forms", () => expect(normalizeCompany("Müller & Söhne GmbH & Co. KG")).toBe("muller sohne"));
});

describe("text utils", () => {
  it("converts (double-escaped) HTML to text", () => {
    expect(htmlToText("&lt;p&gt;Hello &amp;amp; welcome&lt;/p&gt;<ul><li>A</li></ul>")).toContain("Hello & welcome");
  });
  it("detects languages", () => {
    expect(detectLanguage("Wir suchen eine erfahrene Person für unser Team und bieten Ihnen eine spannende Aufgabe mit Kenntnisse")).toBe("de");
    expect(detectLanguage("We are looking for an experienced engineer to join our team and you will work with our customers")).toBe("en");
  });
});

describe("skills", () => {
  it("detects skills with symbols and aliases, not ambiguous words in strict mode", () => {
    const s = detectSkills("Erfahrung mit C#, .NET, Node.js und k8s. Let's go to the office.", { strict: true });
    expect(s).toEqual(expect.arrayContaining(["C#", ".NET", "Node.js", "Kubernetes"]));
    expect(s).not.toContain("Go");
  });
  it("flags cover-letter skills that are not in the profile", () => {
    expect(findUnsupportedSkills("Ich habe tiefe Erfahrung mit Kubernetes und React.", ["React"])).toEqual(["Kubernetes"]);
  });
});
