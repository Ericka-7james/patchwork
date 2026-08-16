import { describe, expect, it } from "vitest";
import {
  cleanText,
  cleanTextArray,
  createInitialFitState,
  DENSITY_BALANCED,
  DENSITY_NORMAL,
  DENSITY_ROOMY,
  getContactItems,
  getMinimumExperienceLimits,
  getTargetDensity,
  hasText,
  normalizeEducation,
  normalizeExperience,
  normalizeProjects,
  normalizeSkillEntries,
  packBlocks,
} from "../../../../components/resume/harvard/harvardResumeUtils";

describe("harvardResumeUtils", () => {
  describe("text helpers", () => {
    it("detects usable text", () => {
      expect(hasText("Python")).toBe(true);
      expect(hasText("  Python  ")).toBe(true);

      expect(hasText("")).toBe(false);
      expect(hasText("   ")).toBe(false);
      expect(hasText(null)).toBe(false);
      expect(hasText(undefined)).toBe(false);
      expect(hasText(123)).toBe(false);
    });

    it("cleans individual text values", () => {
      expect(cleanText("  Python  ")).toBe("Python");

      expect(cleanText("")).toBe("");

      expect(cleanText(null)).toBe("");
    });

    it("cleans arrays of text", () => {
      expect(cleanTextArray([" Python ", "", null, " React ", "   "])).toEqual([
        "Python",
        "React",
      ]);

      expect(cleanTextArray(null)).toEqual([]);
    });
  });

  describe("contact normalization", () => {
    it("returns cleaned contact values", () => {
      expect(
        getContactItems({
          other: [" U.S. Citizen "],
          location: " Atlanta, GA ",
          email: " ericka@example.com ",
          linkedin: " linkedin.com/in/ericka ",
          phone: " 555-123-4567 ",
        })
      ).toEqual([
        "U.S. Citizen",
        "Atlanta, GA",
        "ericka@example.com",
        "linkedin.com/in/ericka",
        "555-123-4567",
      ]);
    });

    it("handles invalid contact data", () => {
      expect(getContactItems(null)).toEqual([]);

      expect(getContactItems([])).toEqual([]);

      expect(getContactItems("invalid")).toEqual([]);
    });
  });

  describe("education normalization", () => {
    it("supports string education entries", () => {
      expect(
        normalizeEducation([" Spelman College ", "Google Tech Exchange"])
      ).toEqual([
        {
          text: "Spelman College",
        },
        {
          text: "Google Tech Exchange",
        },
      ]);
    });

    it("supports object education entries", () => {
      expect(
        normalizeEducation([
          {
            school: "Spelman College",
          },
          {
            institution: "Google Tech Exchange",
          },
        ])
      ).toEqual([
        {
          text: "Spelman College",
        },
        {
          text: "Google Tech Exchange",
        },
      ]);
    });

    it("removes empty education entries", () => {
      expect(normalizeEducation(["", null, {}, "Spelman College"])).toEqual([
        {
          text: "Spelman College",
        },
      ]);
    });
  });

  describe("experience normalization", () => {
    it("supports heading-based experience", () => {
      expect(
        normalizeExperience([
          {
            heading: "JPMorgan Chase — Software Engineer",
            bullets: [" Built features. "],
          },
        ])
      ).toEqual([
        {
          heading: "JPMorgan Chase — Software Engineer",
          subtitle: "",
          dates: "",
          bullets: ["Built features."],
        },
      ]);
    });

    it("supports legacy company role and dates fields", () => {
      expect(
        normalizeExperience([
          {
            company: "JPMorgan Chase",
            role: "Software Engineer",
            dates: "2025",
            bullets: ["Built software."],
          },
        ])
      ).toEqual([
        {
          heading: "JPMorgan Chase — Software Engineer",
          subtitle: "Software Engineer",
          dates: "2025",
          bullets: ["Built software."],
        },
      ]);
    });

    it("uses details when bullets are unavailable", () => {
      const result = normalizeExperience([
        {
          heading: "Company A",
          details: [" Detail one ", ""],
        },
      ]);

      expect(result[0].bullets).toEqual(["Detail one"]);
    });

    it("removes completely empty experience entries", () => {
      expect(normalizeExperience([null, {}, ""])).toEqual([]);
    });
  });

  describe("project normalization", () => {
    it("supports project names and bullets", () => {
      expect(
        normalizeProjects([
          {
            name: "PatchWork",
            description: "Resume platform",
            dates: "2026",
            bullets: ["Built parsing."],
          },
        ])
      ).toEqual([
        {
          heading: "PatchWork",
          description: "Resume platform",
          dates: "2026",
          bullets: ["Built parsing."],
        },
      ]);
    });

    it("supports alternate project field names", () => {
      const result = normalizeProjects([
        {
          title: "Jinx",
          summary: "Robotics platform",
          details: ["Built controls."],
        },
      ]);

      expect(result).toEqual([
        {
          heading: "Jinx",
          description: "Robotics platform",
          dates: "",
          bullets: ["Built controls."],
        },
      ]);
    });
  });

  describe("skills normalization", () => {
    it("returns cleaned skill categories", () => {
      expect(
        normalizeSkillEntries({
          Languages: [" Python ", "", "JavaScript"],
          Empty: [],
          Invalid: "React",
        })
      ).toEqual([["Languages", ["Python", "JavaScript"]]]);
    });

    it("rejects invalid skill structures", () => {
      expect(normalizeSkillEntries(["Python"])).toEqual([]);

      expect(normalizeSkillEntries(null)).toEqual([]);
    });
  });

  describe("experience bullet limits", () => {
    it("preserves all bullets when total is eight or fewer", () => {
      const experience = [
        {
          bullets: ["1", "2", "3", "4"],
        },
        {
          bullets: ["5", "6", "7", "8"],
        },
      ];

      expect(getMinimumExperienceLimits(experience)).toEqual([4, 4]);
    });

    it("preserves at least eight bullets when more exist", () => {
      const experience = [
        {
          bullets: Array(6).fill("A"),
        },
        {
          bullets: Array(6).fill("B"),
        },
      ];

      const result = getMinimumExperienceLimits(experience);

      expect(
        result.reduce((total, count) => total + count, 0)
      ).toBeGreaterThanOrEqual(8);

      expect(result[0]).toBeGreaterThanOrEqual(1);

      expect(result[1]).toBeGreaterThanOrEqual(1);
    });
  });

  describe("density selection", () => {
    it("uses normal density below 50 percent", () => {
      expect(getTargetDensity(0.49)).toBe(DENSITY_NORMAL);
    });

    it("uses balanced density between 50 and 60 percent", () => {
      expect(getTargetDensity(0.5)).toBe(DENSITY_BALANCED);

      expect(getTargetDensity(0.59)).toBe(DENSITY_BALANCED);
    });

    it("uses roomy density at 60 percent or above", () => {
      expect(getTargetDensity(0.6)).toBe(DENSITY_ROOMY);

      expect(getTargetDensity(0.9)).toBe(DENSITY_ROOMY);
    });
  });

  describe("fit state", () => {
    it("creates the initial fit state", () => {
      expect(
        createInitialFitState({
          skillCategoryCount: 5,
          projectCount: 3,
          experienceBulletLimits: [4, 5],
        })
      ).toEqual({
        fitLevelIndex: 0,
        skillCategoryLimit: 5,
        projectLimit: 3,
        experienceBulletLimits: [4, 5],
        density: DENSITY_NORMAL,
        densityAttempted: false,
        pageKeys: [],
        settled: false,
      });
    });
  });

  describe("pagination", () => {
    it("packs blocks into pages", () => {
      const blocks = [
        {
          key: "a",
        },
        {
          key: "b",
        },
        {
          key: "c",
        },
      ];

      const heights = new Map([
        ["a", 400],
        ["b", 400],
        ["c", 400],
      ]);

      const result = packBlocks(blocks, heights, 800);

      expect(result.pages).toEqual([["a", "b"], ["c"]]);

      expect(result.pageUsedHeights).toEqual([800, 400]);
    });

    it("keeps linked blocks together", () => {
      const blocks = [
        {
          key: "before",
        },
        {
          key: "heading",
          keepWithNext: true,
        },
        {
          key: "first-item",
        },
      ];

      const heights = new Map([
        ["before", 600],
        ["heading", 100],
        ["first-item", 200],
      ]);

      const result = packBlocks(blocks, heights, 800);

      expect(result.pages).toEqual([["before"], ["heading", "first-item"]]);
    });

    it("moves a complete experience group to the next page", () => {
      const blocks = [
        {
          key: "before",
        },
        {
          key: "experience-0-heading",
          groupKey: "experience-0",
        },
        {
          key: "experience-0-bullet-0",
          groupKey: "experience-0",
        },
        {
          key: "experience-0-bullet-1",
          groupKey: "experience-0",
        },
      ];

      const heights = new Map([
        ["before", 600],
        ["experience-0-heading", 100],
        ["experience-0-bullet-0", 100],
        ["experience-0-bullet-1", 100],
      ]);

      const result = packBlocks(blocks, heights, 800);

      expect(result.pages).toEqual([
        ["before"],
        [
          "experience-0-heading",
          "experience-0-bullet-0",
          "experience-0-bullet-1",
        ],
      ]);
    });

    it("allows a group larger than one page to split", () => {
      const blocks = [
        {
          key: "experience-0-heading",
          groupKey: "experience-0",
        },
        {
          key: "experience-0-bullet-0",
          groupKey: "experience-0",
        },
        {
          key: "experience-0-bullet-1",
          groupKey: "experience-0",
        },
      ];

      const heights = new Map([
        ["experience-0-heading", 300],
        ["experience-0-bullet-0", 300],
        ["experience-0-bullet-1", 300],
      ]);

      const result = packBlocks(blocks, heights, 700);

      expect(result.pages.length).toBe(2);
    });

    it("reports oversized individual blocks", () => {
      const result = packBlocks(
        [
          {
            key: "huge",
          },
        ],
        new Map([["huge", 900]]),
        800
      );

      expect(result.hasOversizedBlock).toBe(true);
    });
  });
});
