import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, TrendingUp, ListChecks } from "lucide-react";

interface DebriefData {
  what_went_well: string[];
  what_didnt: string[];
  likely_outcomes: string[];
  next_steps: string[];
}

interface SimulationDebriefProps {
  debrief: DebriefData;
}

export default function SimulationDebrief({ debrief }: SimulationDebriefProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* What Went Well */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            What Went Well
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {debrief.what_went_well.map((item, idx) => (
              <li key={idx} className="flex gap-2">
                <span className="text-green-500 mt-1">•</span>
                <span className="text-sm">{item}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* What Didn't */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <XCircle className="h-5 w-5 text-red-500" />
            Areas for Improvement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {debrief.what_didnt.map((item, idx) => (
              <li key={idx} className="flex gap-2">
                <span className="text-red-500 mt-1">•</span>
                <span className="text-sm">{item}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Likely Outcomes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            Likely Outcomes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {debrief.likely_outcomes.map((item, idx) => (
              <li key={idx} className="flex gap-2">
                <span className="text-blue-500 mt-1">•</span>
                <span className="text-sm">{item}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ListChecks className="h-5 w-5 text-purple-500" />
            Recommended Next Steps
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {debrief.next_steps.map((item, idx) => (
              <li key={idx} className="flex gap-2">
                <span className="text-purple-500 mt-1">•</span>
                <span className="text-sm">{item}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
