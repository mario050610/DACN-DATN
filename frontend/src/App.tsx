import { recordBehavior } from "./services/behaviorApi";
import { ShoppingProvider } from "./ShoppingStore";
import { useEffect, useState } from "react";
import BrandIdentity from "./BrandIdentity";
import Platform from "./Platform";
import { useDemoStore } from "./DemoStore";

export default function App() {
  const [page, setPage] = useState(() => window.location.hash);
  const { state } = useDemoStore();
  useEffect(() => {
    const onHash = () => setPage(window.location.hash);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  useEffect(() => {
    if (state.session && state.session.role !== "customer") return;
    const match = page.replace(/^#\/?/, "").match(/^(?:(?:customer)-)?product\/(\d+)$/);
    if (!match) return;
    const campaign=state.campaigns.find(item=>item.productId===Number(match[1]) && item.status==="Đang hoạt động");
    if(campaign) recordBehavior(campaign.id,"view");
  },[page,state.session?.role,state.campaigns]);
  useEffect(() => { window.scrollTo(0, 0); }, [page]);
  if (page === "#brand") return <BrandIdentity />;
  const route = page.replace(/^#\/?/, "").split("?")[0];
  return <ShoppingProvider><Platform route={route && !["landing", "landing-v1", "v1"].includes(route) ? route : state.session ? `${state.session.role}-home` : "explore"} /></ShoppingProvider>;
}
