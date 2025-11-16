import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import CreateDeal from "./pages/CreateDeal";
import DealHome from "./pages/DealHome";
import ArchivedDeals from "./pages/ArchivedDeals";
import AddMeeting from "./pages/AddMeeting";
import MeetingDetails from "./pages/MeetingDetails";
import Stakeholders from "./pages/Stakeholders";
import StakeholderProfile from "./pages/StakeholderProfile";
import StakeholderMap from "./pages/StakeholderMap";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/create-deal" element={<CreateDeal />} />
            <Route path="/deal/:dealId" element={<DealHome />} />
            <Route path="/deal/:dealId/add-meeting" element={<AddMeeting />} />
            <Route path="/deal/:dealId/stakeholders" element={<Stakeholders />} />
            <Route path="/deal/:dealId/stakeholder/:stakeholderId" element={<StakeholderProfile />} />
            <Route path="/deal/:dealId/stakeholder-map" element={<StakeholderMap />} />
            <Route path="/meeting/:meetingId" element={<MeetingDetails />} />
            <Route path="/archived-deals" element={<ArchivedDeals />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
