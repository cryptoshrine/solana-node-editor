import { useState, useEffect } from 'react';
import { useReactFlow } from 'reactflow';

export default function useNodeData(nodeId) {
  const { getNode, setNodes } = useReactFlow();
  const node = getNode(nodeId);
  const [data, setData] = useState(node?.data || {});

  useEffect(() => {
    setNodes(nodes => nodes.map(node => {
      if (node.id === nodeId) {
        return { ...node, data };
      }
      return node;
    }));
  }, [data, nodeId, setNodes]);

  const updateData = (newData) => {
    setData(prev => ({ ...prev, ...newData }));
  };

  return [data, updateData];
}
