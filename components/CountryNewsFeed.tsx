"use client";

import { ExternalLink } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

type RiskCategory = "economic" | "political" | "jurisdiction" | "security";
type FeedTab = "all" | RiskCategory;

type CountryArticle = {
  title: string;
  description: string;
  url: string;
  source: {
    name: string;
  };
  publishedAt: string;
  category: RiskCategory;
  importance: 1 | 2 | 3;
  urlToImage: string | null;
};

type CountryNewsFeedProps = {
  countryCode: string;
};

const tabs = [
  { value: "all", label: "All" },
  { value: "economic", label: "Economic" },
  { value: "political", label: "Political" },
  { value: "jurisdiction", label: "Jurisdiction" },
  { value: "security", label: "Security" },
] as const satisfies readonly { value: FeedTab; label: string }[];

const categoryStyles = {
  economic: "border-emerald-300/20 bg-emerald-300/10 text-emerald-100",
  political: "border-sky-300/20 bg-sky-300/10 text-sky-100",
  jurisdiction: "border-violet-300/20 bg-violet-300/10 text-violet-100",
  security: "border-red-300/20 bg-red-300/10 text-red-100",
} as const;

export function CountryNewsFeed({ countryCode }: CountryNewsFeedProps) {
  const [activeTab, setActiveTab] = useState<FeedTab>("all");
  const [articles, setArticles] = useState<CountryArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    const controller = new AbortController();

    async function loadNews() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/countries/${countryCode}/news`, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Could not load intelligence feed.");
        }

        const payload = (await response.json()) as CountryArticle[];

        if (isActive) {
          setArticles(payload);
        }
      } catch (loadError) {
        if (!controller.signal.aborted && isActive) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load intelligence feed.",
          );
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadNews();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [countryCode]);

  const filteredArticles = useMemo(() => {
    if (activeTab === "all") {
      return articles;
    }

    return articles.filter((article) => article.category === activeTab);
  }, [activeTab, articles]);

  return (
    <div className="flex flex-col gap-4">
      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Article category filters"
      >
        {tabs.map((tab) => (
          <button
            aria-selected={activeTab === tab.value}
            className={cn(
              "rounded-md border px-3 py-2 text-sm font-medium transition",
              activeTab === tab.value
                ? "border-cyan-300/50 bg-cyan-300/15 text-cyan-100"
                : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-white",
            )}
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            role="tab"
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? <NewsSkeleton /> : null}

      {!isLoading && error ? (
        <div className="rounded-lg border border-red-400/20 bg-red-500/10 px-5 py-6 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      {!isLoading && !error && filteredArticles.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-[#111827]/70 px-5 py-10 text-center text-sm text-slate-400">
          No articles in this category.
        </div>
      ) : null}

      {!isLoading && !error && filteredArticles.length > 0 ? (
        <div className="grid gap-3">
          {filteredArticles.map((article) => (
            <ArticleCard article={article} key={`${article.url}-${article.publishedAt}`} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function NewsSkeleton() {
  return (
    <div className="grid gap-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          className="min-h-36 animate-pulse rounded-lg border border-white/10 bg-[#111827]/80 p-5"
          key={index}
        >
          <div className="flex flex-col gap-4">
            <div className="h-5 w-28 rounded bg-white/10" />
            <div className="h-5 w-full rounded bg-white/10" />
            <div className="h-5 w-4/5 rounded bg-white/10" />
            <div className="h-4 w-40 self-end rounded bg-white/10" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ArticleCard({ article }: { article: CountryArticle }) {
  return (
    <a
      className={cn(
        "group block rounded-lg border border-white/10 bg-[#111827]/80 p-5 shadow-sm shadow-black/20 transition duration-200 hover:border-cyan-300/40 hover:bg-[#142033]",
        article.importance === 3 && "border-l-4 border-l-yellow-300",
      )}
      href={article.url}
      rel="noreferrer"
      target="_blank"
    >
      <article className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span
            className={cn(
              "w-fit rounded-md border px-2.5 py-1 text-[11px] font-bold uppercase tracking-normal",
              categoryStyles[article.category],
            )}
          >
            {article.category}
          </span>
          <span className="rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-slate-300">
            Importance {article.importance}
          </span>
        </div>

        <div>
          <h3 className="flex items-start gap-2 text-base font-semibold leading-6 text-white md:text-lg">
            <span>{article.title}</span>
            <ExternalLink
              className="mt-1 size-4 shrink-0 text-slate-500 transition group-hover:text-cyan-200"
              aria-hidden="true"
            />
          </h3>
          {article.description ? (
            <p className="mt-2 text-sm leading-6 text-slate-400">
              {article.description}
            </p>
          ) : null}
        </div>

        <div className="flex justify-end text-right text-xs text-slate-500">
          <span>
            {article.source.name} - {formatTimeAgo(article.publishedAt)}
          </span>
        </div>
      </article>
    </a>
  );
}

function formatTimeAgo(value: string) {
  const publishedAt = new Date(value).getTime();

  if (!Number.isFinite(publishedAt)) {
    return "recently";
  }

  const diffInSeconds = Math.round((publishedAt - Date.now()) / 1000);
  const units = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["week", 60 * 60 * 24 * 7],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
  ] as const;

  for (const [unit, secondsInUnit] of units) {
    const valueInUnit = Math.trunc(diffInSeconds / secondsInUnit);

    if (Math.abs(valueInUnit) >= 1) {
      return new Intl.RelativeTimeFormat("en", {
        numeric: "auto",
      }).format(valueInUnit, unit);
    }
  }

  return "just now";
}
