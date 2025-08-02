import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Animated,
  Dimensions,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/src/store";
import { userAPI } from "@/src/services/api";
import {
  CreditCard,
  Lock,
  CheckCircle,
  ArrowLeft,
  Calendar,
  Shield,
} from "lucide-react-native";

const { width } = Dimensions.get("window");

// Card detection utilities
const detectCardType = (cardNumber: string) => {
  const number = cardNumber.replace(/\s/g, "");

  if (/^4/.test(number)) return "Visa";
  if (/^5[1-5]/.test(number) || /^2[2-7]/.test(number)) return "Mastercard";
  if (/^3[47]/.test(number)) return "American Express";
  if (/^6/.test(number)) return "Discover";

  return "";
};

const formatCardNumber = (value: string) => {
  // Remove all non-digits (spaces, letters, special chars)
  const number = value.replace(/\D/g, "");

  // Limit to 16 digits maximum
  const limitedNumber = number.substring(0, 16);

  // Format in groups of 4 with spaces
  const formatted = limitedNumber.replace(/(.{4})/g, "$1 ").trim();

  return formatted;
};

const validateCardNumber = (cardNumber: string) => {
  const number = cardNumber.replace(/\s/g, "");
  if (number.length < 13 || number.length > 19) return false;

  // Luhn algorithm
  let sum = 0;
  let isEven = false;

  for (let i = number.length - 1; i >= 0; i--) {
    let digit = parseInt(number.charAt(i));

    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
};

const getCardIcon = (cardType: string) => {
  const icons = {
    Visa: "💳",
    Mastercard: "💳",
    "American Express": "💳",
    Discover: "💳",
  };
  return icons[cardType] || "💳";
};

export default function PaymentScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { planType, planName, planPrice, mode, currentPlan } = useLocalSearchParams();

  const [paymentData, setPaymentData] = useState({
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    cardholderName: "",
  });

  const [cardType, setCardType] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCardValid, setIsCardValid] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Animation values
  const [cardFlipAnimation] = useState(new Animated.Value(0));
  const [successAnimation] = useState(new Animated.Value(0));

  useEffect(() => {
    // If in change mode, filter out current plan
    if (mode === "change" && currentPlan) {
      const availablePlans = [
        { type: "FREE", name: "Free Plan", price: "Free" },
        { type: "PREMIUM", name: "Premium Plan", price: "$49/month" },
        { type: "GOLD", name: "Gold Plan", price: "$99/month" },
      ].filter(plan => plan.type !== currentPlan);
      
      // If no plan selected yet, show plan selection
      if (!planType) {
        // Navigate to plan selection with filtered options
        router.replace({
          pathname: "/payment-plan",
          params: { mode: "change", currentPlan },
        });
        return;
      }
    }
    
    const detectedType = detectCardType(paymentData.cardNumber);
    setCardType(detectedType);

    // Validate card number
    if (paymentData.cardNumber.replace(/\s/g, "").length >= 13) {
      setIsCardValid(validateCardNumber(paymentData.cardNumber));
    } else {
      setIsCardValid(false);
    }
  }, [paymentData.cardNumber]);

  const handleCardNumberChange = (text: string) => {
    const formatted = formatCardNumber(text);
    setPaymentData((prev) => ({ ...prev, cardNumber: formatted }));

    // Clear error when user starts typing
    if (errors.cardNumber) {
      setErrors((prev) => ({ ...prev, cardNumber: "" }));
    }
  };

  const handleExpiryChange = (text: string) => {
    // Format as MM/YY
    const cleaned = text.replace(/\D/g, "");
    let formatted = cleaned;

    if (cleaned.length >= 2) {
      formatted = cleaned.substring(0, 2) + "/" + cleaned.substring(2, 4);
    }

    setPaymentData((prev) => ({ ...prev, expiryDate: formatted }));

    if (errors.expiryDate) {
      setErrors((prev) => ({ ...prev, expiryDate: "" }));
    }
  };

  const handleCvvChange = (text: string) => {
    const cleaned = text.replace(/\D/g, "");
    const maxLength = cardType === "American Express" ? 4 : 3;

    setPaymentData((prev) => ({
      ...prev,
      cvv: cleaned.substring(0, maxLength),
    }));

    if (errors.cvv) {
      setErrors((prev) => ({ ...prev, cvv: "" }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!paymentData.cardNumber || !isCardValid) {
      newErrors.cardNumber = "Please enter a valid card number";
    }

    if (!paymentData.expiryDate || paymentData.expiryDate.length !== 5) {
      newErrors.expiryDate = "Please enter a valid expiry date (MM/YY)";
    }

    const requiredCvvLength = cardType === "American Express" ? 4 : 3;
    if (!paymentData.cvv || paymentData.cvv.length !== requiredCvvLength) {
      newErrors.cvv = `Please enter a valid ${requiredCvvLength}-digit CVV`;
    }

    if (!paymentData.cardholderName.trim()) {
      newErrors.cardholderName = "Please enter the cardholder name";
    }

    // Validate expiry date is not in the past
    if (paymentData.expiryDate.length === 5) {
      const [month, year] = paymentData.expiryDate.split("/");
      const expiry = new Date(2000 + parseInt(year), parseInt(month) - 1);
      const now = new Date();

      if (expiry < now) {
        newErrors.expiryDate = "Card has expired";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const processPayment = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setIsLoading(true);

      // Simulate payment processing (always successful for now)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Update user subscription
      await userAPI.updateSubscription(planType as string);

      // Update Redux state
      dispatch({
        type: "auth/updateSubscription",
        payload: { subscription_type: planType },
      });

      // Show success animation
      Animated.spring(successAnimation, {
        toValue: 1,
        useNativeDriver: true,
      }).start();

      // Delay and navigate
      setTimeout(() => {
        Alert.alert(
          "Payment Successful! 🎉",
          `Welcome to ${planName}! Your payment has been processed successfully.`,
          [
            {
              text: "Continue",
              onPress: () => {
                // Fix: Use correct route names without leading slash
                if (planType !== "FREE") {
                  // Use replace instead of push to prevent back navigation issues
                  router.replace("/(tabs)/questionnaire" as any);
                  // Alternative: if questionnaire is a separate screen
                  // router.replace("/questionnaire" as any);
                } else {
                  router.replace("/(tabs)" as any);
                }
              },
            },
          ]
        );
      }, 1000);
    } catch (error: any) {
      console.error("Payment error:", error);
      Alert.alert(
        "Payment Failed",
        "There was an error processing your payment. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCvvFocus = () => {
    // Flip card animation
    Animated.timing(cardFlipAnimation, {
      toValue: 1,
      duration: 600,
      useNativeDriver: false,
    }).start();
  };

  const handleCvvBlur = () => {
    // Flip card back
    Animated.timing(cardFlipAnimation, {
      toValue: 0,
      duration: 600,
      useNativeDriver: false,
    }).start();
  };

  const frontInterpolate = cardFlipAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const backInterpolate = cardFlipAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ["180deg", "360deg"],
  });

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <LinearGradient
        colors={["#047857", "#059669", "#10b981"]}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (mode === "change") {
              router.push("/(tabs)/profile");
            } else {
              router.back();
            }
          }}
        >
          <ArrowLeft size={24} color="white" />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>
            {mode === "change" ? "Change Your Plan" : "Complete Your Payment"}
          </Text>
          <Text style={styles.headerSubtitle}>
            {planName} - {planPrice}
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {/* Animated Credit Card */}
        <View style={styles.cardContainer}>
          <View style={styles.cardWrapper}>
            {/* Front of Card */}
            <Animated.View
              style={[
                styles.creditCard,
                styles.cardFront,
                { transform: [{ rotateY: frontInterpolate }] },
              ]}
            >
              <LinearGradient
                colors={["#047857", "#059669", "#10b981"]}
                style={styles.cardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {/* Background Pattern */}
                <View style={styles.cardPattern}>
                  <View style={styles.patternCircle1} />
                  <View style={styles.patternCircle2} />
                </View>

                <View style={styles.cardHeader}>
                  <Text style={styles.cardBrand}>
                    {getCardIcon(cardType)} {cardType || "CARD"}
                  </Text>
                  <View style={styles.chipIcon}>
                    <LinearGradient
                      colors={["#fbbf24", "#f59e0b"]}
                      style={styles.chip}
                    />
                  </View>
                </View>

                <Text style={styles.cardNumber}>
                  {paymentData.cardNumber || "•••• •••• •••• ••••"}
                </Text>

                <View style={styles.cardFooter}>
                  <View>
                    <Text style={styles.cardLabel}>CARDHOLDER NAME</Text>
                    <Text style={styles.cardValue}>
                      {paymentData.cardholderName.toUpperCase() || "YOUR NAME"}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.cardLabel}>EXPIRES</Text>
                    <Text style={styles.cardValue}>
                      {paymentData.expiryDate || "MM/YY"}
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </Animated.View>

            {/* Back of Card */}
            <Animated.View
              style={[
                styles.creditCard,
                styles.cardBack,
                { transform: [{ rotateY: backInterpolate }] },
              ]}
            >
              <LinearGradient
                colors={["#10b981", "#059669", "#047857"]}
                style={styles.cardGradient}
              >
                <View style={styles.magneticStripe} />
                <View style={styles.cvvContainer}>
                  <Text style={styles.cvvLabel}>CVV</Text>
                  <View style={styles.cvvBox}>
                    <Text style={styles.cvvValue}>
                      {paymentData.cvv || "•••"}
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </Animated.View>
          </View>
        </View>

        {/* Payment Form */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Card Number</Text>
            <View
              style={[
                styles.inputContainer,
                errors.cardNumber && styles.inputContainerError,
              ]}
            >
              <CreditCard size={20} color="#047857" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={paymentData.cardNumber}
                onChangeText={handleCardNumberChange}
                placeholder="1234 5678 9012 3456"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                maxLength={19}
              />
              {cardType && isCardValid && (
                <CheckCircle
                  size={20}
                  color="#10b981"
                  style={styles.validIcon}
                />
              )}
            </View>
            {errors.cardNumber && (
              <Text style={styles.errorText}>{errors.cardNumber}</Text>
            )}
            {cardType && (
              <Text style={styles.cardTypeText}>
                {getCardIcon(cardType)} {cardType} detected
              </Text>
            )}
          </View>

          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 12 }]}>
              <Text style={styles.inputLabel}>Expiry Date</Text>
              <View
                style={[
                  styles.inputContainer,
                  errors.expiryDate && styles.inputContainerError,
                ]}
              >
                <Calendar size={20} color="#047857" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={paymentData.expiryDate}
                  onChangeText={handleExpiryChange}
                  placeholder="MM/YY"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  maxLength={5}
                />
              </View>
              {errors.expiryDate && (
                <Text style={styles.errorText}>{errors.expiryDate}</Text>
              )}
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>CVV</Text>
              <View
                style={[
                  styles.inputContainer,
                  errors.cvv && styles.inputContainerError,
                ]}
              >
                <Shield size={20} color="#047857" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={paymentData.cvv}
                  onChangeText={handleCvvChange}
                  onFocus={handleCvvFocus}
                  onBlur={handleCvvBlur}
                  placeholder="123"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  maxLength={cardType === "American Express" ? 4 : 3}
                  secureTextEntry
                />
              </View>
              {errors.cvv && <Text style={styles.errorText}>{errors.cvv}</Text>}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Cardholder Name</Text>
            <View
              style={[
                styles.inputContainer,
                errors.cardholderName && styles.inputContainerError,
              ]}
            >
              <TextInput
                style={[styles.input, { paddingLeft: 16 }]}
                value={paymentData.cardholderName}
                onChangeText={(text) => {
                  setPaymentData((prev) => ({ ...prev, cardholderName: text }));
                  if (errors.cardholderName) {
                    setErrors((prev) => ({ ...prev, cardholderName: "" }));
                  }
                }}
                placeholder="Full name as shown on card"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="words"
              />
            </View>
            {errors.cardholderName && (
              <Text style={styles.errorText}>{errors.cardholderName}</Text>
            )}
          </View>

          {/* Security Notice */}
          <View style={styles.securityNotice}>
            <Lock size={16} color="#047857" />
            <Text style={styles.securityText}>
              Your payment information is encrypted and secure
            </Text>
          </View>

          {/* Pay Button */}
          <TouchableOpacity
            style={[
              styles.payButton,
              (!isCardValid || isLoading) && styles.payButtonDisabled,
            ]}
            onPress={processPayment}
            disabled={!isCardValid || isLoading}
          >
            <LinearGradient
              colors={["#047857", "#059669", "#10b981"]}
              style={styles.payButtonGradient}
            >
              {isLoading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <Lock size={20} color="white" />
                  <Text style={styles.payButtonText}>Pay {planPrice}</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* Success Animation Overlay */}
      <Animated.View
        style={[
          styles.successOverlay,
          {
            opacity: successAnimation,
            transform: [
              {
                scale: successAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1],
                }),
              },
            ],
          },
        ]}
        pointerEvents={successAnimation._value > 0 ? "auto" : "none"}
      >
        <View style={styles.successContent}>
          <CheckCircle size={80} color="#10b981" />
          <Text style={styles.successTitle}>Payment Successful!</Text>
          <Text style={styles.successMessage}>Welcome to {planName}</Text>
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0fdf4",
  },
  header: {
    height: 120,
    paddingTop: 40,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
  },
  content: {
    padding: 20,
  },
  cardContainer: {
    marginBottom: 32,
    alignItems: "center",
  },
  cardWrapper: {
    width: width - 60,
    height: 200,
  },
  creditCard: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: 16,
    overflow: "hidden",
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    backfaceVisibility: "hidden",
  },
  cardFront: {
    zIndex: 2,
  },
  cardBack: {
    zIndex: 1,
  },
  cardGradient: {
    flex: 1,
    padding: 20,
    justifyContent: "space-between",
  },
  cardPattern: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.1,
  },
  patternCircle1: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1,
    borderColor: "white",
  },
  patternCircle2: {
    position: "absolute",
    bottom: 16,
    left: 16,
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: "white",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 1,
  },
  cardBrand: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
  },
  chipIcon: {
    width: 40,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  chip: {
    width: 32,
    height: 24,
    borderRadius: 4,
  },
  cardNumber: {
    fontSize: 20,
    fontWeight: "600",
    color: "white",
    letterSpacing: 2,
    fontFamily: "monospace",
    zIndex: 1,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    zIndex: 1,
  },
  cardLabel: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.7)",
    marginBottom: 2,
  },
  cardValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "white",
  },
  magneticStripe: {
    height: 40,
    backgroundColor: "#000",
    marginTop: 20,
  },
  cvvContainer: {
    marginTop: 20,
    alignItems: "flex-end",
  },
  cvvLabel: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.7)",
    marginBottom: 4,
  },
  cvvBox: {
    width: 60,
    height: 30,
    backgroundColor: "white",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  cvvValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  form: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 24,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: "#d1fae5",
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#d1fae5",
    borderRadius: 12,
    backgroundColor: "#f9fafb",
    minHeight: 50,
  },
  inputContainerError: {
    borderColor: "#ef4444",
  },
  inputIcon: {
    marginLeft: 12,
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 12,
    fontSize: 16,
    color: "#374151",
  },
  validIcon: {
    marginRight: 12,
  },
  inputRow: {
    flexDirection: "row",
  },
  errorText: {
    fontSize: 12,
    color: "#ef4444",
    marginTop: 4,
  },
  cardTypeText: {
    fontSize: 12,
    color: "#047857",
    marginTop: 4,
    fontWeight: "500",
  },
  securityNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ecfdf5",
    padding: 12,
    borderRadius: 10,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  securityText: {
    fontSize: 12,
    color: "#047857",
    marginLeft: 8,
    flex: 1,
  },
  payButton: {
    borderRadius: 12,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#047857",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  payButtonDisabled: {
    opacity: 0.6,
    elevation: 0,
    shadowOpacity: 0,
  },
  payButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 56,
    paddingHorizontal: 24,
  },
  payButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    marginLeft: 8,
  },
  successOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10000,
  },
  successContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 40,
    alignItems: "center",
    margin: 20,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#374151",
    marginTop: 16,
  },
  successMessage: {
    fontSize: 16,
    color: "#6b7280",
    marginTop: 8,
  },
});
