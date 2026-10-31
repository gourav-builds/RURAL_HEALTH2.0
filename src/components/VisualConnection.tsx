import { createContext, useContext, useState, type ReactNode } from 'react';
const VisualConnection = createContext<{preview: boolean|null;setPreview:(value:boolean|null)=>void}>({preview:null,setPreview:()=>{}});
/** Visual presentation state only. Does not touch the browser or SyncContext. */
export function VisualConnectionProvider({children}:{children:ReactNode}){
  const [preview,setPreview]=useState<boolean|null>(null);
  return <VisualConnection.Provider value={{preview,setPreview}}>{children}</VisualConnection.Provider>;
}
export const useVisualConnection=()=>useContext(VisualConnection);

