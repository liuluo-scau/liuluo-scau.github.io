(function () {
  const languageMap = {
    en: "en",
    zh: "zh-CN",
  };

  const labels = {
    en: {
      doi: "DOI",
      source: "Source",
      pdf: "PDF",
      pdfAccess: "PDF via article page",
      pdfAccessTitle: "Open the article page to access the PDF. An institutional login or subscription may be required.",
      journalArticle: "Journal Article",
      conferencePaper: "Conference Paper",
      firstAuthorGroup: "First-Author Journal Articles",
      correspondingAuthorGroup: "Corresponding-Author Journal Articles",
      coauthorGroup: "Other Co-Authored Journal Articles",
      conferenceGroup: "Conference Papers",
      volume: "Vol.",
      issue: "No.",
      pages: "Pages",
    },
    zh: {
      doi: "DOI",
      source: "来源",
      pdf: "PDF 下载",
      pdfAccess: "在论文页面获取 PDF",
      pdfAccessTitle: "在论文页面打开 PDF，部分论文需要机构登录或订阅。",
      journalArticle: "期刊论文",
      conferencePaper: "会议论文",
      firstAuthorGroup: "第一作者期刊论文",
      correspondingAuthorGroup: "通讯作者期刊论文",
      coauthorGroup: "其他合著期刊论文",
      conferenceGroup: "会议论文",
      volume: "卷",
      issue: "期",
      pages: "页",
    },
  };

  function publicationType(type, lang) {
    return labels[lang][type] || type || labels[lang].journalArticle;
  }

  function buildMeta(publication, lang) {
    const parts = [];
    if (publication.journal) parts.push(publication.journal);
    if (publication.year) parts.push(publication.year);
    if (publication.volume) parts.push(`${labels[lang].volume} ${publication.volume}`);
    if (publication.issue) parts.push(`${labels[lang].issue} ${publication.issue}`);
    if (publication.pages) parts.push(`${labels[lang].pages} ${publication.pages}`);
    return parts.join(" · ");
  }

  function publicationUrl(publication) {
    return publication.doi
      ? `https://doi.org/${publication.doi}`
      : publication.url || "";
  }

  function createLink(href, label) {
    const link = document.createElement("a");
    link.className = "publication-link";
    link.href = href;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = label;
    return link;
  }

  function normalizeAuthorName(name) {
    return (name || "")
      .replace(/\*+$/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function isLiuLuo(name) {
    const normalized = normalizeAuthorName(name);
    return normalized === "liu luo" || normalized === "luo liu" || normalized === "刘洛";
  }

  function getCorrespondingAuthors(publication) {
    const authors = publication.correspondingAuthors || publication.corresponding || [];
    const authorList = Array.isArray(authors) ? authors : String(authors).split(";");
    return new Set(authorList.map(normalizeAuthorName).filter(Boolean));
  }

  function getAuthors(publication) {
    return (publication.authors || "").split(";").map((author) => author.trim()).filter(Boolean);
  }

  function isCorrespondingAuthor(author, correspondingAuthors) {
    return /\*+$/.test(author) || correspondingAuthors.has(normalizeAuthorName(author));
  }

  function publicationGroup(publication) {
    if (publication.type === "conferencePaper") return "conferenceGroup";

    const authors = getAuthors(publication);
    if (isLiuLuo(authors[0])) return "firstAuthorGroup";
    const correspondingAuthors = getCorrespondingAuthors(publication);
    if (authors.some((author) => isLiuLuo(author) && isCorrespondingAuthor(author, correspondingAuthors))) {
      return "correspondingAuthorGroup";
    }
    return "coauthorGroup";
  }

  function renderAuthors(publication) {
    const container = document.createElement("p");
    container.className = "publication-authors";

    const correspondingAuthors = getCorrespondingAuthors(publication);
    const authors = getAuthors(publication);

    authors.forEach((authorName, index) => {
      if (index > 0) container.appendChild(document.createTextNode("; "));

      const cleanName = authorName.replace(/\*+$/g, "").trim();
      const author = document.createElement(isLiuLuo(cleanName) ? "strong" : "span");
      if (isLiuLuo(cleanName)) author.className = "primary-author";
      author.textContent = cleanName;
      container.appendChild(author);

      if (isCorrespondingAuthor(authorName, correspondingAuthors)) {
        const marker = document.createElement("sup");
        marker.className = "corresponding-author";
        marker.textContent = "*";
        container.appendChild(marker);
      }
    });

    return container;
  }

  function renderPublications(lang) {
    const list = document.getElementById("publication-list");
    const publications = window.PUBLICATIONS || [];
    if (!list) return;

    document.querySelectorAll("[data-publication-count]").forEach((node) => {
      node.textContent = publications.length;
    });

    list.replaceChildren();

    const groups = ["firstAuthorGroup", "correspondingAuthorGroup", "coauthorGroup", "conferenceGroup"];
    const byRole = new Map(groups.map((role) => [role, []]));
    [...publications].sort((a, b) => Number(b.year || 0) - Number(a.year || 0))
      .forEach((publication) => byRole.get(publicationGroup(publication)).push(publication));

    Array.from(byRole)
      .forEach(([role, entries]) => {
        if (!entries.length) return;
        const group = document.createElement("section");
        group.className = "publication-group";

        const heading = document.createElement("h3");
        heading.textContent = labels[lang][role];
        group.appendChild(heading);

        const orderedList = document.createElement("ol");
        orderedList.className = "publication-items";
        orderedList.reversed = true;

        entries.forEach((publication) => {
          const item = document.createElement("li");
          item.className = "publication";

          const title = document.createElement("span");
          title.className = "paper-title";
          title.textContent = publication.title || "Untitled";
          item.appendChild(title);

          item.appendChild(renderAuthors(publication));

          const meta = document.createElement("p");
          meta.className = "publication-meta";
          meta.textContent = buildMeta(publication, lang);
          item.appendChild(meta);

          const footer = document.createElement("div");
          footer.className = "publication-footer";

          const type = document.createElement("span");
          type.className = "publication-type";
          type.textContent = publicationType(publication.type, lang);
          footer.appendChild(type);

          const sourceUrl = publicationUrl(publication);
          if (sourceUrl) {
            const sourceLabel = publication.doi ? labels[lang].doi : labels[lang].source;
            footer.appendChild(createLink(sourceUrl, sourceLabel));
          }

          const directPdf = publication.pdfFile || publication.pdfUrl;
          const pdfHref = directPdf || publication.pdfAccessUrl || sourceUrl;
          if (pdfHref) {
            const pdfLabel = directPdf ? labels[lang].pdf : labels[lang].pdfAccess;
            const pdfLink = createLink(pdfHref, pdfLabel);
            pdfLink.classList.add("publication-pdf");
            if (publication.pdfFile) {
              pdfLink.removeAttribute("target");
              pdfLink.setAttribute("download", "");
            } else if (!directPdf) {
              pdfLink.title = labels[lang].pdfAccessTitle;
            }
            footer.appendChild(pdfLink);
          }

          item.appendChild(footer);
          orderedList.appendChild(item);
        });

        group.appendChild(orderedList);
        list.appendChild(group);
      });
  }

  function setLanguage(lang) {
    const selected = lang === "zh" ? "zh" : "en";
    document.documentElement.lang = languageMap[selected];

    document.querySelectorAll("[data-lang]").forEach((node) => {
      node.hidden = node.dataset.lang !== selected;
    });

    document.querySelectorAll("[data-set-language]").forEach((button) => {
      const active = button.dataset.setLanguage === selected;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    renderPublications(selected);
  }

  document.querySelectorAll("[data-set-language]").forEach((button) => {
    button.addEventListener("click", () => setLanguage(button.dataset.setLanguage));
  });

  setLanguage("en");
})();
