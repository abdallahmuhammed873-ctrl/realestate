import fs from "fs";
import path from "path";

type RuntimeRecord = Record<string, any>;

type RuntimeData = {
  users: RuntimeRecord[];
  listings: RuntimeRecord[];
  properties: RuntimeRecord[];
  favorites: RuntimeRecord[];
  appointments: RuntimeRecord[];
  savedSearches: RuntimeRecord[];
  sellerMessages: RuntimeRecord[];
  communityPosts: RuntimeRecord[];
  communityPostLikes: RuntimeRecord[];
  communityPostComments: RuntimeRecord[];
  communityPostCommentLikes: RuntimeRecord[];
  communityListingLikes: RuntimeRecord[];
  communityListingComments: RuntimeRecord[];
  communityListingCommentLikes: RuntimeRecord[];
};

export function loadRuntimeData(): RuntimeData {
  const demoDbPath = path.join(process.cwd(), ".demo-db.json");
  if (!fs.existsSync(demoDbPath)) {
    throw new Error("Missing .demo-db.json. Phase 2 migration scripts seed PostgreSQL from the current runtime data file.");
  }

  const raw = fs.readFileSync(demoDbPath, "utf8").trim();
  if (!raw) {
    throw new Error(".demo-db.json is empty.");
  }

  const data = JSON.parse(raw) as Partial<RuntimeData>;
  if (!Array.isArray(data.users) || !Array.isArray(data.listings) || !Array.isArray(data.properties)) {
    throw new Error(".demo-db.json does not contain the expected runtime collections.");
  }

  return {
    users: data.users ?? [],
    listings: data.listings ?? [],
    properties: data.properties ?? [],
    favorites: data.favorites ?? [],
    appointments: data.appointments ?? [],
    savedSearches: data.savedSearches ?? [],
    sellerMessages: data.sellerMessages ?? [],
    communityPosts: data.communityPosts ?? [],
    communityPostLikes: data.communityPostLikes ?? [],
    communityPostComments: data.communityPostComments ?? [],
    communityPostCommentLikes: data.communityPostCommentLikes ?? [],
    communityListingLikes: data.communityListingLikes ?? [],
    communityListingComments: data.communityListingComments ?? [],
    communityListingCommentLikes: data.communityListingCommentLikes ?? []
  };
}
