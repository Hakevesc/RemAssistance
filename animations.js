s(() => {
  "use strict";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const EASE = t => 1 - Math.pow(1 - t, 3);

  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const unique = items => [...new Set(items.filter(Boolean))];

  const selectors = {
    nav: "header, nav, .navbar, .nav, .site-header",
    hero: ".hero, .hero-section, [data-hero], main > section:first-of-type, body > section:first-of-type",
    card: ".card, .feature-card, .pricing-card, .testimonial-card, .stat-card, .benefit-card, .case-card, [class='card']",
    button: "button, .btn, .button, [class='btn'], a[href].cta, a[href][class='button']",
    badge: ".badge, .pill, .tag, .trust-badge, [class='badge'], [class*='pill']",
    media: "img, video, picture, .hero-media, .image, .mockup, .dashboard, .browser, [class*='image'], [class*='mockup']",
    progress: ".progress-bar, .progress-fill, .bar-fill, [data-progress], [role='progressbar']",
    counter: "[data-count], [data-counter], .counter, .stat-number, .metric-number, .kpi-number, [class*='counter'], [class*='metric'], [class*='stat-number']",
    testimonial: ".testimonial, .testimonial-card, [class*='testimonial']",
    faq: ".faq, [class*='faq'], #faq",
    footer: "footer, .footer, [class*='footer']",
    calculator: ".calculator, [class*='calculator'], #calculator, [data-calculator]",
    decor: ".gradient, .blob, .orb, .glow, .blur, [class*='gradient'], [class*='blob'], [class*='orb'], [class*='glow']"
  };

  const callbacks = new WeakMap();

  const observer = new IntersectionObserver((entries, io) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;

      const callback = callbacks.get(entry.target);
      if (callback) callback(entry.target);

      io.unobserve(entry.target);
    });
  }, {
    threshold: 0.18,
    rootMargin: "0px 0px -8% 0px"
  });

  const observeOnce = (el, callback) => {
    if (!el) return;
    callbacks.set(el, callback);
    observer.observe(el);
  };

  const setReveal = (el, type = "reveal", delay = 0, duration = 820) => {
    if (!el || el.dataset.animPrepared === "true") return;

    el.classList.add(type);
    el.style.setProperty("--anim-delay", `${delay}ms`);
    el.style.setProperty("--anim-duration", `${duration}ms`);
    el.dataset.animPrepared = "true";
  };

  const reveal = el => {
    if (!el) return;
    el.classList.add("is-visible");

    window.setTimeout(() => {
      el.style.willChange = "auto";
    }, 1100);
  };

  const revealMany = elements => {
    elements.forEach(reveal);
  };

  const parseNumber = text => {
    const raw = String(text || "").trim();
    const match = raw.match(/(-?\d[\d,].?\d)/);

    if (!match) return null;

    const value = parseFloat(match[1].replace(/,/g, ""));
    if (Number.isNaN(value)) return null;

    const start = match.index;
    const end = start + match[1].length;

    return {
      value,
      prefix: raw.slice(0, start),
      suffix: raw.slice(end),
      decimals: match[1].includes(".") ? match[1].split(".")[1].length : 0
    };
  };

  const formatNumber = (value, meta) => {
    const fixed = value.toFixed(meta.decimals || 0);
    const withCommas = fixed.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return `${meta.prefix || ""}${withCommas}${meta.suffix || ""}`;
  };

  const animateNumber = (el, from, to, meta, duration = 900) => {
    if (!el || prefersReducedMotion) {
      if (el) el.textContent = formatNumber(to, meta);
      return;
    }

    const start = performance.now();
    el.dataset.animatingValue = "true";

    const tick = now => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = EASE(progress);
      const value = from + (to - from) * eased;

      el.textContent = formatNumber(value, meta);

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        el.textContent = formatNumber(to, meta);
        el.dataset.currentNumber = String(to);
        el.dataset.animatingValue = "false";
      }
    };

    requestAnimationFrame(tick);
  };

  const prepareCounters = root => {
    const counters = qsa(selectors.counter, root).filter(el => {
      const parsed = parseNumber(el.textContent);
      return parsed && Math.abs(parsed.value) < 1000000000;
    });

    counters.forEach(el => {
      if (el.dataset.counterPrepared === "true") return;

      const parsed = parseNumber(el.textContent);
      if (!parsed) return;

      el.dataset.targetNumber = String(parsed.value);
      el.dataset.currentNumber = "0";
      el.dataset.counterPrefix = parsed.prefix;
      el.dataset.counterSuffix = parsed.suffix;
      el.dataset.counterDecimals = String(parsed.decimals);
      el.dataset.counterPrepared = "true";

      if (!prefersReducedMotion) {
        el.textContent = formatNumber(0, parsed);
      }
    });

    return counters;
  };

  const runCounters = root => {
    const counters = qsa(selectors.counter, root).filter(el => el.dataset.counterPrepared === "true");

    counters.forEach(el => {
      if (el.dataset.counterAnimated === "true") return;

      const target = Number(el.dataset.targetNumber || 0);
      const meta = {
        prefix: el.dataset.counterPrefix || "",
        suffix: el.dataset.counterSuffix || "",
        decimals: Number(el.dataset.counterDecimals || 0)
      };

      el.dataset.counterAnimated = "true";
      animateNumber(el, 0, target, meta, 950);
    });
  };

  const prepareProgress = root => {
    const bars = qsa(selectors.progress, root);

    bars.forEach(bar => {
      if (bar.dataset.progressPrepared === "true") return;

      const computedWidth = bar.style.width || bar.getAttribute("aria-valuenow") || bar.dataset.progress;

      bar.classList.add("premium-progress-fill");
      bar.dataset.progressPrepared = "true";

      if (computedWidth && !bar.style.getPropertyValue("--final-width")) {
        bar.style.setProperty("--final-width", /^\d+$/.test(computedWidth) ? `${computedWidth}%` : computedWidth);
      }
    });

    const circles = qsa("svg circle", root).filter(circle => {
      const stroke = getComputedStyle(circle).stroke;
      return stroke && stroke !== "none";
    });

    circles.forEach(circle => {
      if (circle.dataset.circlePrepared === "true") return;

      try {
        const length = circle.getTotalLength();
        circle.classList.add("premium-circle");
        circle.style.strokeDasharray = length;
        circle.style.strokeDashoffset = length;
        circle.dataset.circleLength = String(length);
        circle.dataset.circlePrepared = "true";
      } catch (_) {}
    });
  };

  const runProgress = root => {
    qsa(".premium-progress-fill", root).forEach(bar => {
      bar.classList.add("is-filled");
    });

    qsa(".premium-circle", root).forEach(circle => {
      circle.style.strokeDashoffset = "0";
    });
  };

  const prepareHero = () => {
    const nav = qs(selectors.nav);
    const hero = qs(selectors.hero);

    if (nav) {
      setReveal(nav, "reveal-nav", 80, 760);
    }

    if (!hero) return;

    const heading = qs("h1", hero);
    const eyebrow = qs(".eyebrow, .subtitle, .label, .badge, .pill, [class*='eyebrow']", hero);
    const paragraphs = qsa("p", hero).slice(0, 2);
    const buttons = qsa(selectors.button, hero).slice(0, 3);
    const badges = qsa(selectors.badge, hero).filter(el => el !== eyebrow).slice(0, 8);
    const media = qsa(selectors.media, hero).filter(el => !el.closest("a, button")).slice(-2);

    unique([eyebrow, heading, ...paragraphs]).forEach((el, i) => {
      setReveal(el, "reveal", 130 + i * 35, 840);
    });

    buttons.forEach(button => {
      setReveal(button, "reveal", 260, 760);
      button.classList.add("premium-button");
    });

    badges.forEach((badge, i) => {
      setReveal(badge, "reveal", 340 + i * 70, 680);
      badge.classList.add("premium-badge");
    });

    media.forEach((el, i) => {
      setReveal(el, "reveal-scale", 220 + i * 80, 900);
    });

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (nav) reveal(nav);
        unique([eyebrow, heading, ...paragraphs, ...buttons, ...badges, ...media]).forEach(reveal);
      });
    });
  };

  const prepareSections = () => {
    const hero = qs(selectors.hero);
    const sections = qsa("main section, section, .section").filter(section => section !== hero);

    sections.forEach(section => {
      const sectionEls = unique([
        qs("h2, .section-title, [class*='title']", section),
        qs(".section-eyebrow, .eyebrow, .label, [class*='eyebrow']", section),
        ...qsa(":scope > p, .section-header p, .section-copy, [class*='subtitle']", section).slice(0, 2),
        ...qsa(selectors.button, section).slice(0, 2),
        ...qsa(selectors.media, section).filter(el => !el.closest(selectors.card)).slice(0, 3)
      ]).filter(el => !el.closest(selectors.card));

      sectionEls.forEach(el => {
        const isMedia = el.matches(selectors.media);
        setReveal(el, isMedia ? "reveal-scale" : "reveal", 0, 820);
      });

      if (sectionEls.length) {
        observeOnce(section, () => {
          revealMany(sectionEls);
          runCounters(section);
          runProgress(section);
        });
      }

      prepareCounters(section);
      prepareProgress(section);
    });
  };

  const prepareCards = () => {
    const cards = qsa(selectors.card).filter(card => {
      if (card.closest("header, nav")) return false;
      return card.children.length || card.textContent.trim().length > 20;
    });

    cards.forEach(card => card.classList.add("premium-card"));

    const cardParents = unique(cards.map(card => card.parentElement)).filter(parent => {
      const childCards = qsa(":scope > " + selectors.card.split(",").join(", :scope > "), parent);
      return childCards.length > 1;
    });

    const grouped = new Set();

    cardParents.forEach(parent => {
      const groupCards = qsa(":scope > " + selectors.card.split(",").join(", :scope > "), parent);

      groupCards.forEach((card, i) => {
        grouped.add(card);
        setReveal(card, "reveal-card", i * 75, 640);
      });

      observeOnce(parent, () => {
        revealMany(groupCards);
      });
    });

    cards.filter(card => !grouped.has(card)).forEach(card => {
      setReveal(card, "reveal-card", 0, 640);
      observeOnce(card, reveal);
    });
  };

  const prepareButtonsAndLinks = () => {
    qsa(selectors.button).forEach(button => {
      button.classList.add("premium-button");
    });

    qsa("a[href]").forEach(link => {
      if (link.classList.contains("premium-button")) return;
      // Skip full-card overlay links (position absolute covering a card)
      const style = getComputedStyle(link);
      if (style.position === "absolute" && (style.inset === "0px" || style.top === "0px" && style.left === "0px" && style.right === "0px" && style.bottom === "0px")) return;
      if (link.closest("nav, header, footer") || link.textContent.trim().length < 32) {
        link.classList.add("premium-link");
      }
    });
  };

  const prepareBadgesIconsDecor = () => {
    qsa(selectors.badge).forEach(badge => {
      badge.classList.add("premium-badge");
    });

    qsa("svg, .icon, [class*='icon']").forEach(icon => {
      if (icon.closest("button, a")) return;
      icon.classList.add("premium-icon-float");
    });

    qsa(selectors.decor).forEach(decor => {
      if (decor.closest("button, a")) return;
      decor.classList.add("premium-decor");
    });
  };

  const prepareCalculator = () => {
    const calculators = qsa(selectors.calculator);

    calculators.forEach(calc => {
      prepareCounters(calc);
      prepareProgress(calc);

      const numericEls = qsa("*", calc).filter(el => {
        if (["INPUT", "TEXTAREA", "SELECT", "OPTION"].includes(el.tagName)) return false;
        if (el.children.length > 2) return false;
        return parseNumber(el.textContent);
      });

      numericEls.forEach(el => {
        const parsed = parseNumber(el.textContent);
        if (!parsed) return;
        el.dataset.currentNumber = String(parsed.value);
      });

      const observer = new MutationObserver(mutations => {
        const changed = unique(mutations.map(mutation => {
          return mutation.target.nodeType === Node.TEXT_NODE
            ? mutation.target.parentElement
            : mutation.target;
        })).filter(Boolean);

        changed.forEach(el => {
          if (el.dataset.animatingValue === "true") return;

          const parsed = parseNumber(el.textContent);
          if (!parsed) return;

          const from = Number(el.dataset.currentNumber || parsed.value);
          const to = parsed.value;

          if (from === to) return;

          animateNumber(el, from, to, parsed, 520);
        });
      });

      observer.observe(calc, {
        childList: true,
        characterData: true,
        subtree: true
      });

      qsa("input[type='range']", calc).forEach(range => {
        const update = () => {
          const min = Number(range.min || 0);
          const max = Number(range.max || 100);
          const value = Number(range.value || 0);
          const progress = (value - min) / Math.max(max - min, 1);
          const degree = -120 + progress * 240;

          qsa(".dial, .needle, .gauge, [class='dial'], [class*='needle']", calc).forEach(dial => {
            dial.classList.add("premium-dial");
            dial.style.transform = `rotate(${degree}deg)`;
          });

          qsa(".premium-progress-fill", calc).forEach(bar => {
            bar.style.transform = `scaleX(${Math.max(0, Math.min(progress, 1))})`;
          });
        };

        range.addEventListener("input", () => requestAnimationFrame(update), { passive: true });
        update();
      });
    });
  };

  const prepareTestimonials = () => {
    const testimonialSections = qsa("[class*='testimonial'], #testimonials, .testimonials");

    testimonialSections.forEach(section => {
      const cards = qsa(selectors.card, section);

      cards.forEach((card, i) => {
        setReveal(card, "reveal-card", i * 70, 640);
        card.classList.add("premium-card");
      });

      if (cards.length) {
        observeOnce(section, () => revealMany(cards));
      }

      const track =
        qs(".testimonial-track, .carousel-track, .slider-track, [class*='track']", section) ||
        cards[0]?.parentElement;

      if (!track || track.dataset.marqueeEnhanced === "true") return;
      if (cards.length < 3) return;

      const parentStyle = getComputedStyle(track.parentElement);
      const isHorizontal =
        parentStyle.overflowX === "auto" ||
        parentStyle.overflowX === "scroll" ||
        track.scrollWidth > track.parentElement.clientWidth ||
        /track|carousel|slider|marquee/i.test(track.className);

      if (!isHorizontal) return;

      const originalChildren = Array.from(track.children);
      originalChildren.forEach(child => {
        const clone = child.cloneNode(true);
        clone.setAttribute("aria-hidden", "true");
        track.appendChild(clone);
      });

      track.classList.add("premium-marquee");
      track.dataset.marqueeEnhanced = "true";

      const duration = Math.max(32, Math.min(70, originalChildren.length * 8));
      track.style.setProperty("--marquee-duration", `${duration}s`);
    });
  };

  const prepareFAQ = () => {
    const faqRoots = qsa(selectors.faq);

    faqRoots.forEach(root => {
      const buttons = qsa("button, [role='button'], .faq-question, [class*='question']", root);

      buttons.forEach(button => {
        if (button.dataset.faqPrepared === "true") return;

        const item = button.closest("li, .faq-item, .accordion-item, [class*='item']") || button.parentElement;
        if (!item) return;

        const answer =
          qs(".faq-answer, .accordion-content, .answer, [class*='answer'], [class*='content']", item) ||
          button.nextElementSibling;

        if (!answer || answer === button) return;

        button.dataset.faqPrepared = "true";

        const icon = qs("svg, .icon, [class*='icon']", button);
        if (icon) icon.classList.add("premium-faq-icon");

        // If the item already has a working accordion (e.g. .open class toggling),
        // just enhance the icon rotation and let the existing CSS handle the open/close.
        const hasExistingAccordion = item.classList.contains("faq-item") || answer.classList.contains("faq-a");

        if (hasExistingAccordion) {
          button.addEventListener("click", () => {
            const isOpen = item.classList.contains("open");
            if (icon) icon.classList.toggle("is-open", !isOpen);
          });
          return;
        }

        answer.classList.add("premium-faq-answer");

        const open = () => {
          answer.classList.add("is-open");
          answer.style.height = `${answer.scrollHeight}px`;
          button.setAttribute("aria-expanded", "true");
          if (icon) icon.classList.add("is-open");

          const onEnd = event => {
            if (event.propertyName !== "height") return;
            answer.style.height = "auto";
            answer.removeEventListener("transitionend", onEnd);
          };

          answer.addEventListener("transitionend", onEnd);
        };

        const close = () => {
          answer.style.height = `${answer.scrollHeight}px`;

          requestAnimationFrame(() => {
            answer.classList.remove("is-open");
            answer.style.height = "0px";
            button.setAttribute("aria-expanded", "false");
            if (icon) icon.classList.remove("is-open");
          });
        };

        if (button.getAttribute("aria-expanded") === "true" || answer.classList.contains("open") || answer.classList.contains("active")) {
          open();
        }

        button.addEventListener("click", () => {
          const isOpen = button.getAttribute("aria-expanded") === "true" || answer.classList.contains("is-open");

          if (isOpen) {
            close();
          } else {
            open();
          }
        });
      });
    });
  };

  const prepareFooter = () => {
    const footer = qs(selectors.footer);
    if (!footer) return;

    setReveal(footer, "reveal", 0, 820);

    const columns = qsa(":scope > *, .footer-column, [class='column']", footer).slice(0, 8);
    columns.forEach((column, i) => {
      setReveal(column, "reveal", i * 70, 760);
    });

    const social = qsa("a[href*='twitter'], a[href*='x.com'], a[href*='linkedin'], a[href*='github'], a[href*='instagram'], .social a", footer);
    social.forEach(icon => {
      setReveal(icon, "reveal", 120, 620);
    });

    observeOnce(footer, () => {
      reveal(footer);
      revealMany(columns);
      revealMany(social);
    });
  };

  const prepareParallax = () => {
    const elements = qsa(".premium-decor").slice(0, 12);
    if (!elements.length || prefersReducedMotion) return;

    let latestY = window.scrollY;
    let ticking = false;

    const update = () => {
      const viewport = window.innerHeight;

      elements.forEach((el, i) => {
        const rect = el.getBoundingClientRect();
        if (rect.bottom < -100 || rect.top > viewport + 100) return;

        const depth = 0.015 + (i % 5) * 0.006;
        const offset = (rect.top - viewport / 2) * depth;

        el.style.transform = `translate3d(0, ${offset.toFixed(2)}px, 0)`;
      });

      ticking = false;
    };

    const onScroll = () => {
      latestY = window.scrollY;

      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    update();
  };

  const boot = () => {
    prepareButtonsAndLinks();
    prepareBadgesIconsDecor();

    prepareHero();
    prepareCards();
    prepareSections();
    prepareCalculator();
    prepareTestimonials();
    prepareFAQ();
    prepareFooter();

    document.documentElement.classList.add("anim-ready");

    if (prefersReducedMotion) {
      qsa(".reveal, .reveal-card, .reveal-scale, .reveal-nav").forEach(reveal);
      qsa(".premium-progress-fill").forEach(bar => bar.classList.add("is-filled"));
      qsa(".premium-circle").forEach(circle => {
        circle.style.strokeDashoffset = "0";
      });
      return;
    }

    prepareParallax();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();