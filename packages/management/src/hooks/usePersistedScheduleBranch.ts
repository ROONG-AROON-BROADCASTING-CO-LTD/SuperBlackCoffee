import { useCallback, useState } from 'react';

function branchCodeFromUrl() {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('scheduleBranch');
}

export function usePersistedScheduleBranch() {
  const [selectedBranchCode, setSelectedBranchCode] =
    useState(branchCodeFromUrl);

  const selectBranch = useCallback((branchCode: string) => {
    setSelectedBranchCode(branchCode);
    const url = new URL(window.location.href);
    url.searchParams.set('scheduleBranch', branchCode);
    window.history.replaceState(
      window.history.state,
      '',
      `${url.pathname}${url.search}${url.hash}`,
    );
  }, []);

  return { selectedBranchCode, selectBranch };
}
