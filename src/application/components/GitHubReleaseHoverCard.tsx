import { useEffect, useReducer, type ReactNode } from "react";
import { HoverCard } from "./HoverCard";
import { Badge } from "./Badge";
import { Markdown } from "./Markdown";
import { Spinner } from "./Spinner";

interface GitHubReleaseHoverCardProps {
  children?: ReactNode;
  version: string;
}

export function GitHubReleaseHoverCard({
  children,
  version,
}: GitHubReleaseHoverCardProps) {
  if (version.startsWith("0.0.0")) {
    return children;
  }

  return (
    <HoverCard>
      <HoverCard.Trigger>{children}</HoverCard.Trigger>
      <HoverCard.Content>
        <CardContents version={version} />
      </HoverCard.Content>
    </HoverCard>
  );
}

type ReleaseState =
  | { status: "pending"; release: null }
  | { status: "success"; release: GitHubRelease }
  | { status: "error"; release: null };

type Action =
  | { type: "load" }
  | { type: "success"; release: GitHubRelease }
  | { type: "failed" };

function reducer(state: ReleaseState, action: Action): ReleaseState {
  switch (action.type) {
    case "load":
      return { status: "pending", release: null };
    case "success":
      return { status: "success", release: action.release };
    case "failed":
      return { status: "error", release: null };
    default:
      return state;
  }
}

function CardContents({ version }: { version: string }) {
  const [{ status, release }, dispatch] = useReducer(reducer, {
    status: "pending",
    release: null,
  });

  useEffect(() => {
    let ignored = false;
    dispatch({ type: "load" });
    getGitHubRelease(version).then(
      (release) => {
        if (ignored) {
          return;
        }

        dispatch({ type: "success", release });
      },
      () => {
        if (!ignored) {
          dispatch({ type: "failed" });
        }
      }
    );

    return () => {
      ignored = true;
    };
  }, [version]);

  if (status === "pending") {
    return (
      <div className="flex items-center justify-center min-w-80 min-h-80">
        <Spinner size="lg" />
      </div>
    );
  }

  if (status === "error") {
    return "Error";
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-2 bg-primary dark:bg-primary-dark">
        <h2 className="text-xl text-heading dark:text-heading-dark font-heading font-medium flex items-center gap-2">
          {release.name}{" "}
          {release.prerelease && <Badge variant="beta">Prerelease</Badge>}
        </h2>
      </header>
      <Markdown>{release.body}</Markdown>
    </div>
  );
}

interface GitHubRelease {
  id: number;
  tag_name: string;
  name: string;
  body: string;
  prerelease: boolean;
  created_at: string;
  publishd_at: string;
  target_commitish: string;
}

const cache = new Map<string, GitHubRelease>();

async function getGitHubRelease(version: string): Promise<GitHubRelease> {
  if (cache.has(version)) {
    return cache.get(version)!;
  }

  return fetch(
    `https://api.github.com/repos/apollographql/apollo-client/releases/tags/v${version}`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  )
    .then((res) => res.json() as Promise<GitHubRelease>)
    .then((release) => {
      cache.set(version, release);
      return release;
    });
}
