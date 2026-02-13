import type { TreeNode } from '@/components/git/types';

export function filterTree(nodes: TreeNode[], filter: string): TreeNode[] {
  if (!filter) return nodes;
  const lc = filter.toLowerCase();

  const result: TreeNode[] = [];
  for (const node of nodes) {
    if (node.type === 'file') {
      if (node.name.toLowerCase().includes(lc)) {
        result.push(node);
      }
    } else {
      const nameMatches = node.name.toLowerCase().includes(lc);
      const filteredChildren = node.children ? filterTree(node.children, filter) : [];
      if (nameMatches || filteredChildren.length > 0) {
        result.push({ ...node, children: filteredChildren });
      }
    }
  }
  return result;
}
