export const FIT_LEVELS = ["normal", "compact", "tight"];

export const DENSITY_NORMAL = "normal";
export const DENSITY_BALANCED = "balanced";
export const DENSITY_ROOMY = "roomy";

export const MIN_SKILL_CATEGORIES = 3;
export const MIN_PROJECTS = 1;
export const MIN_EXPERIENCE_BULLETS = 8;

export const SECOND_PAGE_MIN_FILL_RATIO = 0.5;
export const ROOMY_FILL_RATIO = 0.6;

export const EMPTY_OBJECT = Object.freeze({});
export const EMPTY_ARRAY = Object.freeze([]);

export function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function cleanText(value) {
  return hasText(value) ? value.trim() : "";
}

export function cleanTextArray(values) {
  return Array.isArray(values)
    ? values.filter(hasText).map((value) => value.trim())
    : [];
}

export function getContactItems(contact) {
  if (!contact || typeof contact !== "object" || Array.isArray(contact)) {
    return [];
  }

  return [
    ...(Array.isArray(contact.other) ? contact.other : []),
    contact.location,
    contact.email,
    contact.linkedin,
    contact.phone,
  ]
    .filter(hasText)
    .map((item) => item.trim());
}

export function normalizeEducation(education) {
  if (!Array.isArray(education)) {
    return [];
  }

  return education
    .map((item) => {
      if (hasText(item)) {
        return {
          text: item.trim(),
        };
      }

      if (!item || typeof item !== "object") {
        return null;
      }

      const text =
        cleanText(item.heading) ||
        cleanText(item.name) ||
        cleanText(item.school) ||
        cleanText(item.institution) ||
        cleanText(item.degree);

      return text ? { text } : null;
    })
    .filter(Boolean);
}

export function normalizeExperience(experience) {
  if (!Array.isArray(experience)) {
    return [];
  }

  return experience
    .filter(Boolean)
    .map((item) => {
      if (typeof item === "string") {
        const heading = cleanText(item);

        return heading
          ? {
              heading,
              subtitle: "",
              dates: "",
              bullets: [],
              hidden: false,
            }
          : null;
      }

      const explicitHeading = cleanText(item.heading);

      const company =
        cleanText(item.company) ||
        cleanText(item.employer) ||
        cleanText(item.organization);

      const role =
        cleanText(item.role) ||
        cleanText(item.title) ||
        cleanText(item.position);

      const dates =
        cleanText(item.dates) ||
        cleanText(item.date) ||
        cleanText(item.duration);

      const heading =
        explicitHeading || [company, role].filter(Boolean).join(" — ");

      const directBullets = cleanTextArray(item.bullets);

      const bullets =
        directBullets.length > 0 ? directBullets : cleanTextArray(item.details);

      if (!heading && !role && !dates && bullets.length === 0) {
        return null;
      }

      return {
        heading,
        subtitle: explicitHeading ? "" : role,
        dates: explicitHeading ? "" : dates,
        bullets,
        hidden: item.hidden === true,
      };
    })
    .filter(Boolean);
}

export function normalizeProjects(projects) {
  if (!Array.isArray(projects)) {
    return [];
  }

  return projects
    .filter(Boolean)
    .map((item, index) => {
      if (typeof item === "string") {
        const heading = cleanText(item);

        return heading
          ? {
              heading,
              description: "",
              dates: "",
              bullets: [],
            }
          : null;
      }

      const heading =
        cleanText(item.name) ||
        cleanText(item.title) ||
        cleanText(item.heading) ||
        cleanText(item.project_name) ||
        cleanText(item.projectName) ||
        `Project ${index + 1}`;

      const description =
        cleanText(item.description) ||
        cleanText(item.summary) ||
        cleanText(item.subtitle);

      const dates =
        cleanText(item.dates) ||
        cleanText(item.date) ||
        cleanText(item.duration);

      const directBullets = cleanTextArray(item.bullets);

      const bullets =
        directBullets.length > 0 ? directBullets : cleanTextArray(item.details);

      if (!heading && !description && !dates && bullets.length === 0) {
        return null;
      }

      return {
        heading,
        description,
        dates,
        bullets,
      };
    })
    .filter(Boolean);
}

export function normalizeSkillEntries(skills) {
  if (!skills || typeof skills !== "object" || Array.isArray(skills)) {
    return [];
  }

  return Object.entries(skills)
    .map(([category, values]) => {
      if (!hasText(category) || !Array.isArray(values)) {
        return null;
      }

      const cleanValues = cleanTextArray(values);

      if (cleanValues.length === 0) {
        return null;
      }

      return [category.trim(), cleanValues];
    })
    .filter(Boolean);
}

export function getMinimumExperienceLimits(experience) {
  const originalLimits = experience.map((item) => item.bullets.length);

  const totalBullets = originalLimits.reduce(
    (total, count) => total + count,
    0
  );

  if (totalBullets <= MIN_EXPERIENCE_BULLETS) {
    return originalLimits;
  }

  const minimumLimits = originalLimits.map((count) => (count > 0 ? 1 : 0));

  let allocated = minimumLimits.reduce((total, count) => total + count, 0);

  const target = Math.min(
    totalBullets,
    Math.max(MIN_EXPERIENCE_BULLETS, allocated)
  );

  let index = 0;

  while (allocated < target && originalLimits.length > 0) {
    const currentIndex = index % originalLimits.length;

    if (minimumLimits[currentIndex] < originalLimits[currentIndex]) {
      minimumLimits[currentIndex] += 1;
      allocated += 1;
    }

    index += 1;
  }

  return minimumLimits;
}

export function getTargetDensity(fillRatio) {
  if (fillRatio >= ROOMY_FILL_RATIO) {
    return DENSITY_ROOMY;
  }

  if (fillRatio >= SECOND_PAGE_MIN_FILL_RATIO) {
    return DENSITY_BALANCED;
  }

  return DENSITY_NORMAL;
}

export function createInitialFitState({
  skillCategoryCount,
  projectCount,
  experienceBulletLimits,
}) {
  return {
    fitLevelIndex: 0,
    skillCategoryLimit: skillCategoryCount,
    projectLimit: projectCount,
    experienceBulletLimits,
    density: DENSITY_NORMAL,
    densityAttempted: false,
    pageKeys: [],
    settled: false,
  };
}

export function packBlocks(blocks, heights, availableHeight) {
  const pages = [];
  const pageUsedHeights = [];

  let currentPage = [];
  let usedHeight = 0;
  let hasOversizedBlock = false;

  function finishPage() {
    if (currentPage.length === 0) {
      return;
    }

    pages.push(currentPage);
    pageUsedHeights.push(usedHeight);

    currentPage = [];
    usedHeight = 0;
  }

  function getBlockHeight(block) {
    return heights.get(block.key) ?? 0;
  }

  function getKeepTogetherHeight(startIndex) {
    let totalHeight = 0;
    let index = startIndex;

    while (index < blocks.length) {
      const block = blocks[index];

      totalHeight += getBlockHeight(block);

      if (!block.keepWithNext) {
        break;
      }

      index += 1;
    }

    return totalHeight;
  }

  function getGroupEndIndex(startIndex, groupKey) {
    let endIndex = startIndex;

    while (
      endIndex + 1 < blocks.length &&
      blocks[endIndex + 1].groupKey === groupKey
    ) {
      endIndex += 1;
    }

    return endIndex;
  }

  function getGroupHeight(startIndex, endIndex) {
    let totalHeight = 0;

    for (let index = startIndex; index <= endIndex; index += 1) {
      totalHeight += getBlockHeight(blocks[index]);
    }

    return totalHeight;
  }

  let index = 0;

  while (index < blocks.length) {
    const block = blocks[index];

    const blockHeight = getBlockHeight(block);

    if (blockHeight > availableHeight) {
      hasOversizedBlock = true;
    }

    if (block.groupKey) {
      const groupEndIndex = getGroupEndIndex(index, block.groupKey);

      const groupHeight = getGroupHeight(index, groupEndIndex);

      const groupFitsOnPage = groupHeight <= availableHeight;

      if (
        groupFitsOnPage &&
        currentPage.length > 0 &&
        usedHeight + groupHeight > availableHeight
      ) {
        finishPage();
      }

      if (groupFitsOnPage) {
        for (
          let groupIndex = index;
          groupIndex <= groupEndIndex;
          groupIndex += 1
        ) {
          const groupBlock = blocks[groupIndex];

          currentPage.push(groupBlock.key);

          usedHeight += getBlockHeight(groupBlock);
        }

        index = groupEndIndex + 1;

        continue;
      }
    }

    const requiredHeight = block.keepWithNext
      ? getKeepTogetherHeight(index)
      : blockHeight;

    if (
      currentPage.length > 0 &&
      usedHeight + requiredHeight > availableHeight
    ) {
      finishPage();
    }

    currentPage.push(block.key);

    usedHeight += blockHeight;

    index += 1;
  }

  finishPage();

  return {
    pages,
    pageUsedHeights,
    hasOversizedBlock,
  };
}
