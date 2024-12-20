"use client";

import { InsightSheet } from "@/modules/ee/insights/components/insight-sheet";
import { UserIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import formbricks from "@formbricks/js";
import { TDocumentFilterCriteria } from "@formbricks/types/documents";
import { TInsight, TInsightFilterCriteria } from "@formbricks/types/insights";
import { TUserLocale } from "@formbricks/types/user";
import { Badge } from "@formbricks/ui/components/Badge";
import { Button } from "@formbricks/ui/components/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@formbricks/ui/components/Table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@formbricks/ui/components/Tabs";
import { getEnvironmentInsightsAction } from "../actions";
import { InsightLoading } from "./insight-loading";

interface InsightViewProps {
  statsFrom?: Date;
  environmentId: string;
  documentsPerPage: number;
  insightsPerPage: number;
  locale: TUserLocale;
}

export const InsightView = ({
  statsFrom,
  environmentId,
  insightsPerPage,
  documentsPerPage,
  locale,
}: InsightViewProps) => {
  const t = useTranslations();
  const [insights, setInsights] = useState<TInsight[]>([]);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [isFetching, setIsFetching] = useState(true);
  const [isInsightSheetOpen, setIsInsightSheetOpen] = useState(false);
  const [currentInsight, setCurrentInsight] = useState<TInsight | null>(null);
  const [activeTab, setActiveTab] = useState<string>("all");

  const handleFeedback = (feedback: "positive" | "negative") => {
    formbricks.track("AI Insight Feedback", {
      hiddenFields: {
        feedbackSentiment: feedback,
        insightId: currentInsight?.id,
        insightTitle: currentInsight?.title,
        insightDescription: currentInsight?.description,
        insightCategory: currentInsight?.category,
        environmentId: currentInsight?.environmentId,
      },
    });
  };

  const insightsFilter: TInsightFilterCriteria = useMemo(
    () => ({
      documentCreatedAt: {
        min: statsFrom,
      },
      category: activeTab === "all" ? undefined : (activeTab as TInsight["category"]),
    }),
    [statsFrom, activeTab]
  );

  const documentsFilter: TDocumentFilterCriteria = useMemo(
    () => ({
      createdAt: {
        min: statsFrom,
      },
    }),
    [statsFrom]
  );

  useEffect(() => {
    const fetchInitialInsights = async () => {
      setIsFetching(true);
      setInsights([]);
      const res = await getEnvironmentInsightsAction({
        environmentId,
        limit: insightsPerPage,
        offset: 0,
        insightsFilter,
      });
      if (res?.data) {
        setInsights(res.data);
        setHasMore(res.data.length >= insightsPerPage);
        setIsFetching(false);
      }
    };

    fetchInitialInsights();
  }, [environmentId, insightsPerPage, insightsFilter]);

  const fetchNextPage = useCallback(async () => {
    if (!hasMore) return;
    setIsFetching(true);
    const res = await getEnvironmentInsightsAction({
      environmentId,
      limit: insightsPerPage,
      offset: insights.length,
      insightsFilter,
    });
    if (res?.data) {
      setInsights((prevInsights) => [...prevInsights, ...(res.data || [])]);
      setHasMore(res.data.length >= insightsPerPage);
      setIsFetching(false);
    }
  }, [environmentId, insights, insightsPerPage, insightsFilter, hasMore]);

  const handleFilterSelect = (value: string) => {
    setActiveTab(value);
  };

  return (
    <div>
      <Tabs defaultValue="all" onValueChange={handleFilterSelect}>
        <TabsList>
          <TabsTrigger value="all">{t("environments.experience.all")}</TabsTrigger>
          <TabsTrigger value="complaint">{t("environments.experience.complaint")}</TabsTrigger>
          <TabsTrigger value="featureRequest">{t("environments.experience.feature_request")}</TabsTrigger>
          <TabsTrigger value="praise">{t("environments.experience.praise")}</TabsTrigger>
          <TabsTrigger value="other">{t("common.other")}</TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>{t("common.title")}</TableHead>
                <TableHead>{t("common.description")}</TableHead>
                <TableHead>{t("environments.experience.category")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {insights.length === 0 && !isFetching ? (
                <TableRow className="pointer-events-none">
                  <TableCell colSpan={4} className="py-8 text-center">
                    <p className="text-slate-500">{t("environments.experience.no_insights_found")}</p>
                  </TableCell>
                </TableRow>
              ) : (
                insights.map((insight) => (
                  <TableRow
                    key={insight.id}
                    className="group cursor-pointer hover:bg-slate-50"
                    onClick={() => {
                      setCurrentInsight(insight);
                      setIsInsightSheetOpen(true);
                    }}>
                    <TableCell className="flex font-medium">
                      {insight._count.documentInsights} <UserIcon className="ml-2 h-4 w-4" />
                    </TableCell>
                    <TableCell className="font-medium">{insight.title}</TableCell>
                    <TableCell className="underline-offset-2 group-hover:underline">
                      {insight.description}
                    </TableCell>
                    <TableCell>
                      {insight.category === "complaint" ? (
                        <Badge text="Complaint" type="error" size="tiny" />
                      ) : insight.category === "featureRequest" ? (
                        <Badge text="Feature Request" type="warning" size="tiny" />
                      ) : insight.category === "praise" ? (
                        <Badge text="Praise" type="success" size="tiny" />
                      ) : (
                        <Badge text="Other" type="gray" size="tiny" />
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {isFetching && <InsightLoading />}
        </TabsContent>
      </Tabs>

      {hasMore && !isFetching && (
        <div className="flex justify-center py-5">
          <Button onClick={fetchNextPage} variant="secondary" size="sm" loading={isFetching}>
            {t("common.load_more")}
          </Button>
        </div>
      )}

      <InsightSheet
        isOpen={isInsightSheetOpen}
        setIsOpen={setIsInsightSheetOpen}
        insight={currentInsight}
        handleFeedback={handleFeedback}
        documentsFilter={documentsFilter}
        documentsPerPage={documentsPerPage}
        locale={locale}
      />
    </div>
  );
};
