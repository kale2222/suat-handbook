import React, { type ReactNode } from "react";
import clsx from "clsx";
import { ThemeClassNames } from "@docusaurus/theme-common";
import { useDoc } from "@docusaurus/plugin-content-docs/client";
import TagsListInline from "@theme/TagsListInline";
import EditMetaRow from "@theme/EditMetaRow";

export default function DocItemFooter(): ReactNode {
  const { metadata } = useDoc();
  const { editUrl, lastUpdatedAt, lastUpdatedBy, tags, frontMatter } = metadata;

  const rawContributors = (frontMatter as Record<string, unknown>)
    ?.contributors;
  const contributors: string[] = Array.isArray(rawContributors)
    ? (rawContributors as string[])
    : typeof rawContributors === "string"
    ? [rawContributors]
    : [];

  const canDisplayTagsRow = tags.length > 0;
  const canDisplayEditMetaRow = !!(editUrl || lastUpdatedAt || lastUpdatedBy);
  const canDisplayContributors = contributors.length > 0;

  const canDisplayFooter =
    canDisplayTagsRow || canDisplayEditMetaRow || canDisplayContributors;

  if (!canDisplayFooter) {
    return null;
  }

  return (
    <footer
      className={clsx(ThemeClassNames.docs.docFooter, "docusaurus-mt-lg")}
    >
      {canDisplayTagsRow && (
        <div
          className={clsx(
            "row margin-top--sm",
            ThemeClassNames.docs.docFooterTagsRow
          )}
        >
          <div className="col">
            <TagsListInline tags={tags} />
          </div>
        </div>
      )}
      {canDisplayEditMetaRow && (
        <EditMetaRow
          className={clsx(
            "margin-top--sm",
            ThemeClassNames.docs.docFooterEditMetaRow
          )}
          editUrl={editUrl}
          lastUpdatedAt={lastUpdatedAt}
          lastUpdatedBy={lastUpdatedBy}
        />
      )}
      {canDisplayContributors && (
        <div className="row">
          <div
            className="col"
            style={{
              textAlign: "right",
              color: "var(--ifm-color-emphasis-700)",
              fontSize: "0.85rem",
            }}
          >
            本文贡献者: {contributors.join(", ")}
          </div>
        </div>
      )}
    </footer>
  );
}
