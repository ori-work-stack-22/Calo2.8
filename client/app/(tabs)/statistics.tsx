import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/src/i18n/context/LanguageContext";
import { useTheme } from "@/src/context/ThemeContext";
import {
  TrendingUp,
  Calendar,
  Target,
  Award,
  Flame,
  Zap,
  Droplets,
  BarChart3,
  PieChart,
  Activity,
  Heart,
  Clock,
  Star,
  ChevronDown,
  ChevronUp,
} from "lucide-react-native";
import { LineChart, BarChart, PieChart as RNPieChart } from "react-native-chart-kit";
import { useStatistics } from "@/hooks/useQueries";
import LoadingScreen from "@/components/LoadingScreen";

const { width } = Dimensions.get("window");
const chartConfig = {
  backgroundGradientFrom: "#ffffff",
  backgroundGradientTo: "#ffffff",
  color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
  strokeWidth: 2,
  barPercentage: 0.7,
  useShadowColorFromDataset: false,
};

const darkChartConfig = {
  backgroundGradientFrom: "#1f2937",
  backgroundGradientTo: "#1f2937",
  color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
  strokeWidth: 2,
  barPercentage: 0.7,
  useShadowColorFromDataset: false,
};

export default function StatisticsScreen() {
  const { t } = useTranslation();
  const { isRTL, language } = useLanguage();
  const { colors, isDark } = useTheme();

  const [selectedTimeRange, setSelectedTimeRange] = useState("week");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["overview"]));

  // Calculate date range based on selection
  const dateRange = useMemo(() => {
    const today = new Date();
    let start: string;
    let end: string = today.toISOString().split("T")[0];

    switch (selectedTimeRange) {
      case "today":
        start = end;
        break;
      case "week":
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        start = weekAgo.toISOString().split("T")[0];
        break;
      case "month":
        const monthAgo = new Date(today);
        monthAgo.setDate(today.getDate() - 30);
        start = monthAgo.toISOString().split("T")[0];
        break;
      case "custom":
        start = startDate;
        end = endDate;
        break;
      default:
        const defaultWeekAgo = new Date(today);
        defaultWeekAgo.setDate(today.getDate() - 7);
        start = defaultWeekAgo.toISOString().split("T")[0];
    }

    return { start, end };
  }, [selectedTimeRange, startDate, endDate]);

  // Fetch statistics
  const { data: statisticsResponse, isLoading, error, refetch } = useStatistics(
    selectedTimeRange,
    dateRange.start,
    dateRange.end
  );

  const statistics = statisticsResponse?.data;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const timeRangeOptions = [
    { key: "today", label: language === "he" ? "היום" : "Today" },
    { key: "week", label: language === "he" ? "שבוע" : "Week" },
    { key: "month", label: language === "he" ? "חודש" : "Month" },
  ];

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!statistics?.dailyBreakdown) return null;

    const dailyData = statistics.dailyBreakdown.slice(-7); // Last 7 days
    
    return {
      labels: dailyData.map(day => {
        const date = new Date(day.date);
        return date.toLocaleDateString(language === "he" ? "he-IL" : "en-US", { 
          weekday: "short" 
        });
      }),
      datasets: [{
        data: dailyData.map(day => day.calories || 0),
        color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
        strokeWidth: 2,
      }],
    };
  }, [statistics, language]);

  const macroData = useMemo(() => {
    if (!statistics) return null;

    const total = (statistics.average_protein_daily * 4) + 
                  (statistics.average_carbs_daily * 4) + 
                  (statistics.average_fats_daily * 9);

    if (total === 0) return null;

    return [
      {
        name: language === "he" ? "חלבון" : "Protein",
        population: Math.round((statistics.average_protein_daily * 4 / total) * 100),
        color: "#3b82f6",
        legendFontColor: colors.text,
        legendFontSize: 12,
      },
      {
        name: language === "he" ? "פחמימות" : "Carbs",
        population: Math.round((statistics.average_carbs_daily * 4 / total) * 100),
        color: "#10b981",
        legendFontColor: colors.text,
        legendFontSize: 12,
      },
      {
        name: language === "he" ? "שומן" : "Fat",
        population: Math.round((statistics.average_fats_daily * 9 / total) * 100),
        color: "#f59e0b",
        legendFontColor: colors.text,
        legendFontSize: 12,
      },
    ];
  }, [statistics, colors.text, language]);

  if (isLoading) {
    return (
      <LoadingScreen 
        text={language === "he" ? "טוען סטטיסטיקות..." : "Loading statistics..."} 
      />
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.text }]}>
            {language === "he" ? "שגיאה בטעינת הנתונים" : "Error loading data"}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.emerald500 }]}
            onPress={() => refetch()}
          >
            <Text style={styles.retryButtonText}>
              {language === "he" ? "נסה שוב" : "Retry"}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }, isRTL && styles.rtlText]}>
          {language === "he" ? "סטטיסטיקות תזונה" : "Nutrition Statistics"}
        </Text>
        <Text style={[styles.subtitle, { color: colors.icon }, isRTL && styles.rtlText]}>
          {language === "he" 
            ? "עקוב אחר ההתקדמות התזונתית שלך"
            : "Track your nutritional progress"
          }
        </Text>
      </View>

      {/* Time Range Selector */}
      <View style={styles.timeRangeContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.timeRangeScroll}
        >
          {timeRangeOptions.map(option => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.timeRangeOption,
                { borderColor: colors.border },
                selectedTimeRange === option.key && { 
                  backgroundColor: colors.emerald500,
                  borderColor: colors.emerald500,
                }
              ]}
              onPress={() => setSelectedTimeRange(option.key)}
            >
              <Text style={[
                styles.timeRangeText,
                { color: selectedTimeRange === option.key ? "#ffffff" : colors.text }
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.emerald500]}
            tintColor={colors.emerald500}
          />
        }
      >
        {/* Overview Cards */}
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection("overview")}
        >
          <View style={styles.sectionHeaderLeft}>
            <BarChart3 size={20} color={colors.emerald500} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {language === "he" ? "סקירה כללית" : "Overview"}
            </Text>
          </View>
          {expandedSections.has("overview") ? (
            <ChevronUp size={20} color={colors.icon} />
          ) : (
            <ChevronDown size={20} color={colors.icon} />
          )}
        </TouchableOpacity>

        {expandedSections.has("overview") && (
          <View style={styles.overviewGrid}>
            <View style={[styles.overviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <LinearGradient
                colors={isDark ? ["#ef4444", "#dc2626"] : ["#fef2f2", "#fee2e2"]}
                style={styles.overviewCardGradient}
              >
                <Flame size={24} color="#ef4444" />
                <Text style={[styles.overviewValue, { color: "#dc2626" }]}>
                  {Math.round(statistics?.average_calories_daily || 0)}
                </Text>
                <Text style={[styles.overviewLabel, { color: "#991b1b" }]}>
                  {language === "he" ? "קלוריות ממוצע" : "Avg Calories"}
                </Text>
              </LinearGradient>
            </View>

            <View style={[styles.overviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <LinearGradient
                colors={isDark ? ["#3b82f6", "#2563eb"] : ["#eff6ff", "#dbeafe"]}
                style={styles.overviewCardGradient}
              >
                <Zap size={24} color="#3b82f6" />
                <Text style={[styles.overviewValue, { color: "#2563eb" }]}>
                  {Math.round(statistics?.average_protein_daily || 0)}g
                </Text>
                <Text style={[styles.overviewLabel, { color: "#1d4ed8" }]}>
                  {language === "he" ? "חלבון ממוצע" : "Avg Protein"}
                </Text>
              </LinearGradient>
            </View>

            <View style={[styles.overviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <LinearGradient
                colors={isDark ? ["#10b981", "#059669"] : ["#ecfdf5", "#d1fae5"]}
                style={styles.overviewCardGradient}
              >
                <Target size={24} color="#10b981" />
                <Text style={[styles.overviewValue, { color: "#059669" }]}>
                  {statistics?.calorie_goal_achievement_percent || 0}%
                </Text>
                <Text style={[styles.overviewLabel, { color: "#047857" }]}>
                  {language === "he" ? "השגת יעדים" : "Goal Achievement"}
                </Text>
              </LinearGradient>
            </View>

            <View style={[styles.overviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <LinearGradient
                colors={isDark ? ["#8b5cf6", "#7c3aed"] : ["#faf5ff", "#f3e8ff"]}
                style={styles.overviewCardGradient}
              >
                <Award size={24} color="#8b5cf6" />
                <Text style={[styles.overviewValue, { color: "#7c3aed" }]}>
                  {statistics?.currentStreak || 0}
                </Text>
                <Text style={[styles.overviewLabel, { color: "#6d28d9" }]}>
                  {language === "he" ? "רצף ימים" : "Day Streak"}
                </Text>
              </LinearGradient>
            </View>
          </View>
        )}

        {/* Daily Trends Chart */}
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection("trends")}
        >
          <View style={styles.sectionHeaderLeft}>
            <TrendingUp size={20} color={colors.emerald500} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {language === "he" ? "מגמות יומיות" : "Daily Trends"}
            </Text>
          </View>
          {expandedSections.has("trends") ? (
            <ChevronUp size={20} color={colors.icon} />
          ) : (
            <ChevronDown size={20} color={colors.icon} />
          )}
        </TouchableOpacity>

        {expandedSections.has("trends") && chartData && (
          <View style={[styles.chartContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.chartTitle, { color: colors.text }]}>
              {language === "he" ? "קלוריות יומיות" : "Daily Calories"}
            </Text>
            <LineChart
              data={chartData}
              width={width - 60}
              height={220}
              chartConfig={isDark ? darkChartConfig : chartConfig}
              bezier
              style={styles.chart}
              withDots={true}
              withShadow={false}
              withVerticalLabels={true}
              withHorizontalLabels={true}
            />
          </View>
        )}

        {/* Macronutrient Distribution */}
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection("macros")}
        >
          <View style={styles.sectionHeaderLeft}>
            <PieChart size={20} color={colors.emerald500} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {language === "he" ? "התפלגות מקרו-נוטריינטים" : "Macronutrient Distribution"}
            </Text>
          </View>
          {expandedSections.has("macros") ? (
            <ChevronUp size={20} color={colors.icon} />
          ) : (
            <ChevronDown size={20} color={colors.icon} />
          )}
        </TouchableOpacity>

        {expandedSections.has("macros") && macroData && (
          <View style={[styles.chartContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.chartTitle, { color: colors.text }]}>
              {language === "he" ? "התפלגות קלוריות" : "Calorie Distribution"}
            </Text>
            <RNPieChart
              data={macroData}
              width={width - 60}
              height={220}
              chartConfig={isDark ? darkChartConfig : chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              center={[10, 50]}
              absolute
            />
          </View>
        )}

        {/* Detailed Nutrition */}
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection("detailed")}
        >
          <View style={styles.sectionHeaderLeft}>
            <Activity size={20} color={colors.emerald500} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {language === "he" ? "פירוט תזונתי מפורט" : "Detailed Nutrition"}
            </Text>
          </View>
          {expandedSections.has("detailed") ? (
            <ChevronUp size={20} color={colors.icon} />
          ) : (
            <ChevronDown size={20} color={colors.icon} />
          )}
        </TouchableOpacity>

        {expandedSections.has("detailed") && (
          <View style={[styles.detailedContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.detailedGrid}>
              <View style={styles.detailedItem}>
                <Droplets size={20} color="#06b6d4" />
                <Text style={[styles.detailedValue, { color: colors.text }]}>
                  {Math.round(statistics?.average_fiber_daily || 0)}g
                </Text>
                <Text style={[styles.detailedLabel, { color: colors.icon }]}>
                  {language === "he" ? "סיבים" : "Fiber"}
                </Text>
              </View>

              <View style={styles.detailedItem}>
                <Heart size={20} color="#ec4899" />
                <Text style={[styles.detailedValue, { color: colors.text }]}>
                  {Math.round(statistics?.average_sugar_daily || 0)}g
                </Text>
                <Text style={[styles.detailedLabel, { color: colors.icon }]}>
                  {language === "he" ? "סוכר" : "Sugar"}
                </Text>
              </View>

              <View style={styles.detailedItem}>
                <Clock size={20} color="#f59e0b" />
                <Text style={[styles.detailedValue, { color: colors.text }]}>
                  {Math.round(statistics?.average_sodium_daily || 0)}mg
                </Text>
                <Text style={[styles.detailedLabel, { color: colors.icon }]}>
                  {language === "he" ? "נתרן" : "Sodium"}
                </Text>
              </View>

              <View style={styles.detailedItem}>
                <Droplets size={20} color="#0ea5e9" />
                <Text style={[styles.detailedValue, { color: colors.text }]}>
                  {Math.round(statistics?.average_fluids_daily || 0)}ml
                </Text>
                <Text style={[styles.detailedLabel, { color: colors.icon }]}>
                  {language === "he" ? "נוזלים" : "Fluids"}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Achievements */}
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection("achievements")}
        >
          <View style={styles.sectionHeaderLeft}>
            <Star size={20} color={colors.emerald500} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {language === "he" ? "הישגים" : "Achievements"}
            </Text>
          </View>
          {expandedSections.has("achievements") ? (
            <ChevronUp size={20} color={colors.icon} />
          ) : (
            <ChevronDown size={20} color={colors.icon} />
          )}
        </TouchableOpacity>

        {expandedSections.has("achievements") && (
          <View style={[styles.achievementsContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.achievementItem}>
              <View style={[styles.achievementIcon, { backgroundColor: "#fef3c7" }]}>
                <Star size={20} color="#f59e0b" />
              </View>
              <View style={styles.achievementContent}>
                <Text style={[styles.achievementTitle, { color: colors.text }]}>
                  {language === "he" ? "רצף שבועי" : "Weekly Streak"}
                </Text>
                <Text style={[styles.achievementDescription, { color: colors.icon }]}>
                  {statistics?.weeklyStreak || 0} {language === "he" ? "שבועות רצופים" : "consecutive weeks"}
                </Text>
              </View>
            </View>

            <View style={styles.achievementItem}>
              <View style={[styles.achievementIcon, { backgroundColor: "#dcfce7" }]}>
                <Target size={20} color="#10b981" />
              </View>
              <View style={styles.achievementContent}>
                <Text style={[styles.achievementTitle, { color: colors.text }]}>
                  {language === "he" ? "ימים מושלמים" : "Perfect Days"}
                </Text>
                <Text style={[styles.achievementDescription, { color: colors.icon }]}>
                  {statistics?.perfectDays || 0} {language === "he" ? "ימים השגת יעדים" : "goal achievement days"}
                </Text>
              </View>
            </View>

            <View style={styles.achievementItem}>
              <View style={[styles.achievementIcon, { backgroundColor: "#e0e7ff" }]}>
                <Award size={20} color="#6366f1" />
              </View>
              <View style={styles.achievementContent}>
                <Text style={[styles.achievementTitle, { color: colors.text }]}>
                  {language === "he" ? "רמה נוכחית" : "Current Level"}
                </Text>
                <Text style={[styles.achievementDescription, { color: colors.icon }]}>
                  {language === "he" ? "רמה" : "Level"} {statistics?.level || 1} • {statistics?.currentXP || 0} XP
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Insights */}
        {statistics?.insights && statistics.insights.length > 0 && (
          <>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => toggleSection("insights")}
            >
              <View style={styles.sectionHeaderLeft}>
                <TrendingUp size={20} color={colors.emerald500} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {language === "he" ? "תובנות" : "Insights"}
                </Text>
              </View>
              {expandedSections.has("insights") ? (
                <ChevronUp size={20} color={colors.icon} />
              ) : (
                <ChevronDown size={20} color={colors.icon} />
              )}
            </TouchableOpacity>

            {expandedSections.has("insights") && (
              <View style={[styles.insightsContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {statistics.insights.map((insight, index) => (
                  <View key={index} style={[styles.insightItem, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.insightText, { color: colors.text }]}>
                      {insight}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
  },
  timeRangeContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  timeRangeScroll: {
    paddingRight: 20,
    gap: 12,
  },
  timeRangeOption: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  timeRangeText: {
    fontSize: 14,
    fontWeight: "500",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  overviewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  overviewCard: {
    flex: 1,
    minWidth: "45%",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
  },
  overviewCardGradient: {
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  overviewValue: {
    fontSize: 24,
    fontWeight: "bold",
  },
  overviewLabel: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
  },
  chartContainer: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
  },
  chart: {
    borderRadius: 12,
  },
  detailedContainer: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
  },
  detailedGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  detailedItem: {
    flex: 1,
    minWidth: "45%",
    alignItems: "center",
    gap: 8,
  },
  detailedValue: {
    fontSize: 20,
    fontWeight: "bold",
  },
  detailedLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  achievementsContainer: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    gap: 16,
  },
  achievementItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  achievementIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  achievementContent: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  achievementDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  insightsContainer: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    gap: 12,
  },
  insightItem: {
    padding: 16,
    borderRadius: 12,
  },
  insightText: {
    fontSize: 14,
    lineHeight: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
  },
  rtlText: {
    textAlign: "right",
    writingDirection: "rtl",
  },
});