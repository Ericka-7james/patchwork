import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { buildHarvardResumeBlocks } from "../../../../components/resume/harvard/buildHarvardResumeBlocks";

const sections = {
  summary: "Summary",
  education: "Education",
  experience: "Experience",
  projects: "Projects",
  skills: "Skills",
  certifications: "Certifications",
};

function renderBlocks(overrides = {}) {
  const blocks = buildHarvardResumeBlocks({
    name: "Ericka James",

    contactItems: ["Atlanta, GA", "ericka@example.com"],

    summary: "Software engineer.",

    education: [
      {
        text: "Spelman College",
      },
    ],

    experience: [
      {
        heading: "Company A — Engineer",
        subtitle: "",
        dates: "",
        bullets: ["Built feature A.", "Built feature B."],
      },
    ],

    projects: [
      {
        heading: "PatchWork",
        description: "Resume platform",
        dates: "2026",
        bullets: ["Built parsing."],
      },
    ],

    skills: [["Languages", ["Python", "JavaScript"]]],

    certifications: ["AWS Cloud Practitioner"],

    sections,

    ...overrides,
  });

  render(
    <div>
      {blocks.map((block) => (
        <div key={block.key} data-testid={block.key}>
          {block.content}
        </div>
      ))}
    </div>
  );

  return blocks;
}

describe("buildHarvardResumeBlocks", () => {
  it("builds a resume header block", () => {
    const blocks = renderBlocks();

    expect(blocks[0].key).toBe("header");

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Ericka James",
      })
    ).toBeInTheDocument();

    const contact = screen.getByLabelText(/contact information/i);

    expect(within(contact).getByText("Atlanta, GA")).toBeInTheDocument();
  });

  it("builds separate education blocks", () => {
    const blocks = renderBlocks();

    expect(blocks.some((block) => block.key === "education-heading")).toBe(
      true
    );

    expect(blocks.some((block) => block.key === "education-0")).toBe(true);

    expect(screen.getByText("Spelman College")).toBeInTheDocument();
  });

  it("groups each experience entry", () => {
    const blocks = renderBlocks();

    const experienceBlocks = blocks.filter((block) =>
      block.key.startsWith("experience-0-")
    );

    expect(experienceBlocks).toHaveLength(3);

    expect(
      experienceBlocks.every((block) => block.groupKey === "experience-0")
    ).toBe(true);
  });

  it("keeps the experience heading with its first bullet", () => {
    const blocks = renderBlocks();

    const heading = blocks.find(
      (block) => block.key === "experience-0-heading"
    );

    expect(heading.keepWithNext).toBe(true);
  });

  it("renders each experience bullet separately", () => {
    renderBlocks();

    expect(screen.getByText("Built feature A.")).toBeInTheDocument();

    expect(screen.getByText("Built feature B.")).toBeInTheDocument();
  });

  it("builds separate project blocks", () => {
    const blocks = renderBlocks();

    expect(blocks.some((block) => block.key === "project-0-heading")).toBe(
      true
    );

    expect(blocks.some((block) => block.key === "project-0-bullet-0")).toBe(
      true
    );

    expect(screen.getByText("PatchWork")).toBeInTheDocument();

    expect(screen.getByText("Built parsing.")).toBeInTheDocument();
  });

  it("builds skill category blocks", () => {
    const blocks = renderBlocks();

    expect(blocks.some((block) => block.key === "skills-heading")).toBe(true);

    expect(blocks.some((block) => block.key === "skills-0")).toBe(true);

    expect(screen.getByText("Languages:")).toBeInTheDocument();

    expect(screen.getByText(/Python, JavaScript/)).toBeInTheDocument();
  });

  it("builds individual certification blocks", () => {
    const blocks = renderBlocks();

    expect(blocks.some((block) => block.key === "certifications-heading")).toBe(
      true
    );

    expect(blocks.some((block) => block.key === "certification-0")).toBe(true);

    expect(screen.getByText("AWS Cloud Practitioner")).toBeInTheDocument();
  });

  it("omits empty sections", () => {
    const blocks = renderBlocks({
      summary: "",
      education: [],
      experience: [],
      projects: [],
      skills: [],
      certifications: [],
    });

    expect(blocks.map((block) => block.key)).toEqual(["header"]);
  });

  it("supports an empty resume safely", () => {
    const blocks = buildHarvardResumeBlocks({
      name: "",
      contactItems: [],
      summary: "",
      education: [],
      experience: [],
      projects: [],
      skills: [],
      certifications: [],
      sections,
    });

    expect(blocks).toEqual([]);
  });
});
