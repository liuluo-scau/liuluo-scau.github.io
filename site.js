(function () {
  const languageMap = {
    en: "en",
    zh: "zh-CN",
  };

  const labels = {
    en: {
      doi: "DOI",
      source: "Source",
      journalArticle: "Journal Article",
      conferencePaper: "Conference Paper",
      volume: "Vol.",
      issue: "No.",
      pages: "Pages",
    },
    zh: {
      doi: "DOI",
      source: "来源",
      journalArticle: "期刊论文",
      conferencePaper: "会议论文",
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
    if (publication.volume) parts.push(`${labels[lang].volume} ${publication.volume}`);
    if (publication.issue) parts.push(`${labels[lang].issue} ${publication.issue}`);
    if (publication.pages) parts.push(`${labels[lang].pages} ${publication.pages}`);
    return parts.join(" · ");
  }

  function createLink(publication, lang) {
    const href = publication.doi
      ? `https://doi.org/${publication.doi}`
      : publication.url || "";
    if (!href) return null;

    const link = document.createElement("a");
    link.className = "publication-link";
    link.href = href;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = publication.doi ? labels[lang].doi : labels[lang].source;
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

  function renderAuthors(publication) {
    const container = document.createElement("p");
    container.className = "publication-authors";

    const correspondingAuthors = getCorrespondingAuthors(publication);
    const authors = (publication.authors || "")
      .split(";")
      .map((author) => author.trim())
      .filter(Boolean);

    authors.forEach((authorName, index) => {
      if (index > 0) container.appendChild(document.createTextNode("; "));

      const cleanName = authorName.replace(/\*+$/g, "").trim();
      const author = document.createElement(isLiuLuo(cleanName) ? "strong" : "span");
      if (isLiuLuo(cleanName)) author.className = "primary-author";
      author.textContent = cleanName;
      container.appendChild(author);

      if (/\*+$/.test(authorName) || correspondingAuthors.has(normalizeAuthorName(cleanName))) {
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

    const byYear = publications.reduce((groups, publication) => {
      const year = publication.year || "Unknown";
      if (!groups.has(year)) groups.set(year, []);
      groups.get(year).push(publication);
      return groups;
    }, new Map());

    Array.from(byYear.keys())
      .sort((a, b) => Number(b) - Number(a))
      .forEach((year) => {
        const group = document.createElement("section");
        group.className = "publication-year";

        const heading = document.createElement("h3");
        heading.textContent = year;
        group.appendChild(heading);

        const orderedList = document.createElement("ol");
        orderedList.className = "publication-items";

        byYear.get(year).forEach((publication) => {
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

          const link = createLink(publication, lang);
          if (link) footer.appendChild(link);

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
