import type { CollectionEntry } from "astro:content";
import postFilter from "./postFilter";

interface CategoryInfo {
  key: string;
  count: number;
  latestPosts: CollectionEntry<"blog">[];
}

const getPostsByCategory = (
  posts: CollectionEntry<"blog">[],
  maxPostsPerCategory: number = 3
): CategoryInfo[] => {
  const filteredPosts = posts.filter(postFilter);

  const categoryMap = new Map<string, CollectionEntry<"blog">[]>();

  for (const post of filteredPosts) {
    const filePath = post.filePath || "";
    const match = filePath.match(/src\/data\/blog\/([^/]+)\//);
    const category = match ? match[1] : null;
    if (!category) continue;

    if (!categoryMap.has(category)) {
      categoryMap.set(category, []);
    }
    categoryMap.get(category)!.push(post);
  }

  const result: CategoryInfo[] = [];

  for (const [key, categoryPosts] of categoryMap) {
    const sortedPosts = categoryPosts.sort(
      (a, b) =>
        Math.floor(
          new Date(b.data.modDatetime ?? b.data.pubDatetime).getTime() / 1000
        ) -
        Math.floor(
          new Date(a.data.modDatetime ?? a.data.pubDatetime).getTime() / 1000
        )
    );

    result.push({
      key,
      count: sortedPosts.length,
      latestPosts: sortedPosts.slice(0, maxPostsPerCategory),
    });
  }

  return result.sort((a, b) => b.count - a.count);
};

export default getPostsByCategory;
