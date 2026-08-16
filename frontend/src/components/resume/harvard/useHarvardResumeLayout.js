import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  createInitialFitState,
  DENSITY_NORMAL,
  FIT_LEVELS,
  getTargetDensity,
  MIN_PROJECTS,
  MIN_SKILL_CATEGORIES,
  packBlocks,
  SECOND_PAGE_MIN_FILL_RATIO,
} from "./harvardResumeUtils";

export function useHarvardResumeLayout({
  documentRef,
  blocks,
  sourceSignature,
  skillEntries,
  projects,
  initialExperienceBulletLimits,
  minimumExperienceBulletLimits,
  onFitChange,
}) {
  const lastReportRef = useRef("");

  const [fitState, setFitState] = useState(() =>
    createInitialFitState({
      skillCategoryCount: skillEntries.length,
      projectCount: projects.length,
      experienceBulletLimits: initialExperienceBulletLimits,
    })
  );

  useEffect(() => {
    lastReportRef.current = "";

    setFitState(
      createInitialFitState({
        skillCategoryCount: skillEntries.length,
        projectCount: projects.length,
        experienceBulletLimits: initialExperienceBulletLimits,
      })
    );
  }, [
    sourceSignature,
    skillEntries.length,
    projects.length,
    initialExperienceBulletLimits,
  ]);

  const fitLevel = FIT_LEVELS[fitState.fitLevelIndex];

  useLayoutEffect(() => {
    const documentElement = documentRef.current;

    if (!documentElement || blocks.length === 0 || fitState.settled) {
      return;
    }

    const firstPage = documentElement.querySelector(".harvard-resume-page");

    if (!firstPage) {
      return;
    }

    const pageHeight = firstPage.clientHeight;

    if (pageHeight <= 0) {
      return;
    }

    const pageStyles = window.getComputedStyle(firstPage);

    const paddingTop = Number.parseFloat(pageStyles.paddingTop);

    const paddingBottom = Number.parseFloat(pageStyles.paddingBottom);

    if (!Number.isFinite(paddingTop) || !Number.isFinite(paddingBottom)) {
      return;
    }

    const availableHeight = pageHeight - paddingTop - paddingBottom;

    if (!Number.isFinite(availableHeight) || availableHeight <= 0) {
      return;
    }

    const blockElements = documentElement.querySelectorAll(
      ".harvard-resume-measurement [data-resume-block-key]"
    );

    const heights = new Map();

    blockElements.forEach((element) => {
      const key = element.dataset.resumeBlockKey;

      if (!key || heights.has(key)) {
        return;
      }

      heights.set(key, element.getBoundingClientRect().height);
    });

    const result = packBlocks(blocks, heights, availableHeight);

    const pageCount = result.pages.length;

    const lastPageUsedHeight =
      result.pageUsedHeights[result.pageUsedHeights.length - 1] ?? 0;

    const lastPageFillRatio =
      pageCount > 0 ? lastPageUsedHeight / availableHeight : 0;

    const isOnePage = pageCount === 1 && !result.hasOversizedBlock;

    const isHealthyTwoPage =
      pageCount === 2 &&
      lastPageFillRatio >= SECOND_PAGE_MIN_FILL_RATIO &&
      !result.hasOversizedBlock;

    const layoutAcceptable = isOnePage || isHealthyTwoPage;

    const removedSkills = Math.max(
      0,
      skillEntries.length - fitState.skillCategoryLimit
    );

    const removedProjects = Math.max(
      0,
      projects.length - fitState.projectLimit
    );

    const removedExperienceBullets = initialExperienceBulletLimits.reduce(
      (total, originalLimit, index) =>
        total +
        Math.max(
          0,
          originalLimit - (fitState.experienceBulletLimits[index] ?? 0)
        ),
      0
    );

    function reportFit({ fits, pages, mode }) {
      const report = {
        fits,
        pageCount: pages.length,
        lastPageFillRatio,
        removedSkills,
        removedProjects,
        removedExperienceBullets,
        fitLevel,
        density: fitState.density,
        layoutMode: mode,
      };

      const signature = JSON.stringify(report);

      if (lastReportRef.current !== signature) {
        lastReportRef.current = signature;

        onFitChange?.(report);
      }
    }

    function resetDensity(updates) {
      setFitState((current) => ({
        ...current,
        ...updates,
        density: DENSITY_NORMAL,
        densityAttempted: false,
        pageKeys: [],
      }));
    }

    if (fitState.density !== DENSITY_NORMAL && !layoutAcceptable) {
      setFitState((current) => ({
        ...current,
        density: DENSITY_NORMAL,
        densityAttempted: true,
        pageKeys: [],
      }));

      return;
    }

    if (layoutAcceptable) {
      const targetDensity = getTargetDensity(lastPageFillRatio);

      if (!fitState.densityAttempted && targetDensity !== DENSITY_NORMAL) {
        setFitState((current) => ({
          ...current,
          density: targetDensity,
          densityAttempted: true,
          pageKeys: [],
        }));

        return;
      }

      setFitState((current) => ({
        ...current,
        pageKeys: result.pages,
        settled: true,
      }));

      reportFit({
        fits: true,
        pages: result.pages,
        mode: isOnePage ? "one-page" : "two-page",
      });

      return;
    }

    if (fitState.fitLevelIndex < FIT_LEVELS.length - 1) {
      resetDensity({
        fitLevelIndex: fitState.fitLevelIndex + 1,
      });

      return;
    }

    const minimumSkillCategoryCount = Math.min(
      MIN_SKILL_CATEGORIES,
      skillEntries.length
    );

    if (fitState.skillCategoryLimit > minimumSkillCategoryCount) {
      resetDensity({
        skillCategoryLimit: fitState.skillCategoryLimit - 1,
      });

      return;
    }

    const minimumProjectCount =
      projects.length > 0 ? Math.min(MIN_PROJECTS, projects.length) : 0;

    if (fitState.projectLimit > minimumProjectCount) {
      resetDensity({
        projectLimit: fitState.projectLimit - 1,
      });

      return;
    }

    if (fitState.skillCategoryLimit > 0) {
      resetDensity({
        skillCategoryLimit: 0,
      });

      return;
    }

    const experienceIndexToTrim = fitState.experienceBulletLimits.findLastIndex(
      (limit, index) => limit > (minimumExperienceBulletLimits[index] ?? 0)
    );

    if (experienceIndexToTrim !== -1) {
      const nextLimits = [...fitState.experienceBulletLimits];

      nextLimits[experienceIndexToTrim] -= 1;

      resetDensity({
        experienceBulletLimits: nextLimits,
      });

      return;
    }

    if (pageCount <= 2 && !result.hasOversizedBlock) {
      const targetDensity = getTargetDensity(lastPageFillRatio);

      if (!fitState.densityAttempted && targetDensity !== DENSITY_NORMAL) {
        setFitState((current) => ({
          ...current,
          density: targetDensity,
          densityAttempted: true,
          pageKeys: [],
        }));

        return;
      }

      setFitState((current) => ({
        ...current,
        pageKeys: result.pages,
        settled: true,
      }));

      reportFit({
        fits: true,
        pages: result.pages,
        mode: "two-page-required",
      });

      return;
    }

    const finalPages = result.pages.slice(0, 2);

    setFitState((current) => ({
      ...current,
      pageKeys: finalPages,
      settled: true,
    }));

    reportFit({
      fits: false,
      pages: finalPages,
      mode: "overflow",
    });
  }, [
    blocks,
    documentRef,
    fitLevel,
    fitState,
    initialExperienceBulletLimits,
    minimumExperienceBulletLimits,
    onFitChange,
    projects,
    skillEntries,
  ]);

  return {
    fitState,
    fitLevel,
  };
}
