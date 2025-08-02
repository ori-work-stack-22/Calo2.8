import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/src/store";
import { userAPI } from "@/src/services/api";
import { Ionicons } from "@expo/vector-icons";
import { CreditCard, Lock, X, Check } from "lucide-react-native";

type PlanType = "FREE" | "PREMIUM" | "GOLD";

interface Plan {
  id: PlanType;
  name: string;
  price: string;
  features: string[];
  color: string;
  recommended?: boolean;
}

const plans: Plan[] = [
  {
    id: "FREE",
    name: "תוכנית חינמית",
    price: "חינם",
    features: [
      "2 ניתוחי תמונות ביום",
      "תפריט תזונתי בסיסי",
      "מעקב קלוריות",
      "גישה למאגר מתכונים",
    ],
    color: "#4CAF50",
  },
  {
    id: "PREMIUM",
    name: "תוכנית פרימיום",
    price: "₪49/חודש",
    features: [
      "20 ניתוחי תמונות ביום",
      "תפריט תזונתי מותאם אישית",
      "מעקב מפורט אחר מקרו וויטמינים",
      "המלצות AI מתקדמות",
      "גישה לכל המתכונים",
      "תמיכה בצ'אט",
    ],
    color: "#2196F3",
    recommended: true,
  },
  {
    id: "GOLD",
    name: "תוכנית זהב",
    price: "₪99/חודש",
    features: [
      "50 ניתוחי תמונות ביום",
      "תפריט מותאם אישית עם AI מתקדם",
      "מעקב בריאותי מלא",
      "ייעוץ תזונתי אישי",
      "תמיכה עדיפות גבוהה",
      "גישה מוקדמת לפיצ'רים חדשים",
      "דוחות בריאות מפורטים",
    ],
    color: "#FF9800",
  },
];

export default function PaymentPlan() {
  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState({
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    cardholderName: "",
  });
  const [cardType, setCardType] = useState("");
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { mode, currentPlan } = useLocalSearchParams();

  // Filter plans based on mode
  const availablePlans = useMemo(() => {
    if (mode === "change" && currentPlan) {
      return plans.filter(plan => plan.id !== currentPlan);
    }
    return plans;
  }, [mode, currentPlan]);

  const detectCardType = (cardNumber: string) => {
    const number = cardNumber.replace(/\s/g, "");

    if (number.startsWith("4")) return "Visa";
    if (
      number.startsWith("5") ||
      (number.startsWith("2") &&
        number.length >= 2 &&
        parseInt(number.substring(0, 2)) >= 22 &&
        parseInt(number.substring(0, 2)) <= 27)
    )
      return "Mastercard";
    if (number.startsWith("3")) return "American Express";
    if (number.startsWith("6")) return "Discover";

    return "";
  };

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\s/g, "");
    const match = cleaned.match(/.{1,4}/g);
    return match ? match.join(" ") : cleaned;
  };

  const formatExpiryDate = (text: string) => {
    const cleaned = text.replace(/\D/g, "");
    if (cleaned.length >= 2) {
      return cleaned.substring(0, 2) + "/" + cleaned.substring(2, 4);
    }
    return cleaned;
  };

  const validatePaymentData = () => {
    const { cardNumber, expiryDate, cvv, cardholderName } = paymentData;

    if (!cardNumber || cardNumber.replace(/\s/g, "").length < 13) {
      Alert.alert("שגיאה", "מספר כרטיס אשראי לא תקין");
      return false;
    }

    if (!expiryDate || expiryDate.length !== 5) {
      Alert.alert("שגיאה", "תאריך תפוגה לא תקין");
      return false;
    }

    if (!cvv || cvv.length < 3) {
      Alert.alert("שגיאה", "קוד CVV לא תקין");
      return false;
    }

    if (!cardholderName.trim()) {
      Alert.alert("שגיאה", "שם בעל הכרטיס נדרש");
      return false;
    }

    return true;
  };

  const handlePayment = async (planId: PlanType) => {
    if (planId === "FREE") {
      return handlePlanSelection(planId);
    }

    // Get plan details
    const selectedPlan = plans.find((p) => p.id === planId);

    // Navigate to payment page with plan details
    router.push({
      pathname: "/payment",
      params: {
        planType: planId,
        planName: selectedPlan?.name || "",
        planPrice: selectedPlan?.price || "",
      },
    });
  };

  const processPayment = async () => {
    if (!validatePaymentData() || !selectedPlan) return;

    try {
      setIsLoading(true);

      // Simulate payment processing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Process the plan selection
      await handlePlanSelection(selectedPlan);

      setShowPaymentModal(false);
      setPaymentData({
        cardNumber: "",
        expiryDate: "",
        cvv: "",
        cardholderName: "",
      });
    } catch (error) {
      Alert.alert("שגיאה", "התשלום נכשל. אנא נסה שוב.");
    } finally {
      setIsLoading(false);
    }
  };
  const handlePlanSelection = async (planId: PlanType) => {
    try {
      // Check if user is authenticated
      if (!user) {
        throw new Error("User not authenticated");
      }

      console.log("🔄 Updating subscription to:", planId);
      const response = await userAPI.updateSubscription(planId);
      console.log("✅ Subscription update response:", response);

      if (!response.success) {
        throw new Error(response.error || "Failed to update subscription");
      }

      // Update Redux state
      dispatch({
        type: "auth/updateSubscription",
        payload: { subscription_type: planId },
      });

      // Add small delay to prevent re-render conflicts
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Navigate based on plan type
      if (planId === "FREE") {
        router.replace("/(tabs)");
      } else {
        router.replace("/questionnaire");
      }
    } catch (error: any) {
      console.error("Plan selection error:", error);
      Alert.alert("שגיאה", error.message || "נכשל בעדכון התוכנית");
    }
  };

  const handleGoBack = () => {
    if (mode === "change") {
      router.push("/(tabs)/profile");
    } else {
      router.push("/signup");
    }
  };

  const renderPlan = (plan: Plan) => {
    // Don't render current plan in change mode
    if (mode === "change" && plan.id === currentPlan) {
      return null;
    }
    
    return (
    <View
      key={plan.id}
      style={[styles.planCard, plan.recommended && styles.recommendedCard]}
    >
      {plan.recommended && (
        <View style={styles.recommendedBadge}>
          <Text style={styles.recommendedText}>מומלץ</Text>
        </View>
      )}
      <Text style={styles.planName}>{plan.name}</Text>
      <Text style={[styles.planPrice, { color: plan.color }]}>
        {plan.price}
      </Text>

      <View style={styles.featuresContainer}>
        {plan.features.map((feature, index) => (
          <View key={index} style={styles.featureRow}>
            <Text style={styles.checkmark}>✓</Text>
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.selectButton, { backgroundColor: plan.color }]}
        onPress={() => handlePayment(plan.id)}
        accessibilityLabel={`Select ${plan.name} plan`}
      >
        <Text style={styles.selectButtonText}>בחר תוכנית {plan.id}</Text>
      </TouchableOpacity>
    </View>
    );
  };

  const renderPaymentModal = () => (
    <Modal
      visible={showPaymentModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowPaymentModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.paymentModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>פרטי תשלום</Text>
            <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.planSummary}>
              <Text style={styles.summaryTitle}>
                תוכנית נבחרת: {plans.find((p) => p.id === selectedPlan)?.name}
              </Text>
              <Text style={styles.summaryPrice}>
                {plans.find((p) => p.id === selectedPlan)?.price}
              </Text>
            </View>

            <View style={styles.paymentForm}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>מספר כרטיס אשראי</Text>
                <View style={styles.cardInputContainer}>
                  <TextInput
                    style={styles.cardInput}
                    value={paymentData.cardNumber}
                    onChangeText={(text) => {
                      const formatted = formatCardNumber(text);
                      if (formatted.replace(/\s/g, "").length <= 16) {
                        setPaymentData({
                          ...paymentData,
                          cardNumber: formatted,
                        });
                        setCardType(detectCardType(formatted));
                      }
                    }}
                    placeholder="1234 5678 9012 3456"
                    keyboardType="numeric"
                    maxLength={19}
                  />
                  {cardType && (
                    <View style={styles.cardTypeBadge}>
                      <Text style={styles.cardTypeText}>{cardType}</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.inputRow}>
                <View
                  style={[styles.inputContainer, { flex: 1, marginRight: 12 }]}
                >
                  <Text style={styles.inputLabel}>תאריך תפוגה</Text>
                  <TextInput
                    style={styles.input}
                    value={paymentData.expiryDate}
                    onChangeText={(text) => {
                      const formatted = formatExpiryDate(text);
                      if (formatted.length <= 5) {
                        setPaymentData({
                          ...paymentData,
                          expiryDate: formatted,
                        });
                      }
                    }}
                    placeholder="MM/YY"
                    keyboardType="numeric"
                    maxLength={5}
                  />
                </View>

                <View style={[styles.inputContainer, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>CVV</Text>
                  <TextInput
                    style={styles.input}
                    value={paymentData.cvv}
                    onChangeText={(text) => {
                      if (text.length <= 4) {
                        setPaymentData({ ...paymentData, cvv: text });
                      }
                    }}
                    placeholder="123"
                    keyboardType="numeric"
                    maxLength={4}
                    secureTextEntry
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>שם בעל הכרטיס</Text>
                <TextInput
                  style={styles.input}
                  value={paymentData.cardholderName}
                  onChangeText={(text) =>
                    setPaymentData({ ...paymentData, cardholderName: text })
                  }
                  placeholder="שם מלא כפי שמופיע על הכרטיס"
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.securityNotice}>
                <Lock size={16} color="#10b981" />
                <Text style={styles.securityText}>
                  התשלום מאובטח ומוצפן ברמה הגבוהה ביותר
                </Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.cancelPaymentButton}
              onPress={() => setShowPaymentModal(false)}
            >
              <Text style={styles.cancelPaymentText}>ביטול</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.payButton, isLoading && styles.loadingButton]}
              onPress={processPayment}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <CreditCard size={16} color="#ffffff" />
                  <Text style={styles.payButtonText}>שלם עכשיו</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
    >
      <View>
        <TouchableOpacity onPress={handleGoBack}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>
      <View style={styles.header}>
        <Text style={styles.title}>
          {mode === "change" ? "שנה את התוכנית שלך" : "בחר את התוכנית שלך"}
        </Text>
        <Text style={styles.subtitle}>
          {mode === "change" 
            ? "בחר תוכנית חדשה שמתאימה לך יותר"
            : "התחל במסע התזונתי שלך עם התוכנית המתאימה לך"
          }
        </Text>
      </View>

      <View style={styles.plansContainer}>
        {availablePlans.map(renderPlan)}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          ניתן לשנות או לבטל את המנוי בכל עת מהגדרות החשבון
        </Text>
      </View>

      {renderPaymentModal()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  contentContainer: {
    padding: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
    marginTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
  },
  plansContainer: {
    gap: 20,
  },
  planCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    position: "relative",
  },
  recommendedCard: {
    borderWidth: 2,
    borderColor: "#2196F3",
  },
  recommendedBadge: {
    position: "absolute",
    top: -10,
    right: 20,
    backgroundColor: "#2196F3",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  recommendedText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  planName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginBottom: 8,
  },
  planPrice: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  featuresContainer: {
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  checkmark: {
    color: "#4CAF50",
    fontSize: 16,
    fontWeight: "bold",
    marginRight: 12,
  },
  featureText: {
    fontSize: 14,
    color: "#666",
    flex: 1,
  },
  selectButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  loadingButton: {
    opacity: 0.7,
  },
  selectButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  footer: {
    marginTop: 30,
    padding: 20,
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: "#888",
    textAlign: "center",
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  paymentModal: {
    height: "100%",
    backgroundColor: "white",
    borderRadius: 16,
    width: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  planSummary: {
    backgroundColor: "#f8f9fa",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    alignItems: "center",
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  summaryPrice: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2196F3",
  },
  paymentForm: {
    gap: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  cardInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  cardInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  cardTypeBadge: {
    position: "absolute",
    right: 12,
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  cardTypeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  inputRow: {
    flexDirection: "row",
  },
  securityNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  securityText: {
    fontSize: 12,
    color: "#10b981",
    flex: 1,
  },
  modalActions: {
    flexDirection: "row",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    gap: 12,
  },
  cancelPaymentButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
  },
  cancelPaymentText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  payButton: {
    flex: 2,
    flexDirection: "row",
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#10b981",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
  },
});
