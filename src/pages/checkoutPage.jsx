"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ChevronLeft, CreditCard, MapPin, Clock } from "lucide-react"
import { useCart } from "../context/CartProvider"
import { useUser } from "@clerk/clerk-react"
import useNearbyRestaurants from "../hooks/useNearbyRestaurants"

const CheckoutPage = () => {
  const navigate = useNavigate()
  // Get all cart functions and check what's available
  const cart = useCart()
  const { calculateCart, currentRestaurantId, restaurantCarts } = cart
  // Check if clearCart exists, otherwise create a fallback
  const clearCart =
    cart.clearCart ||
    ((restaurantId) => {
      console.log("clearCart function not found, using fallback")
      // If clearCart doesn't exist, we'll just log it and continue
    })

  const [paymentMethod, setPaymentMethod] = useState("cod") // Default to cash on delivery
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentError, setPaymentError] = useState("")
  const { isSignedIn, user } = useUser()
  const { location, loading, error, userAddress } = useNearbyRestaurants()

  // Card details state
  const [cardDetails, setCardDetails] = useState({
    cardNumber: "",
    expiryDate: "",
    cvv: "",
  })

  // Get cart details
  const { totalItems, totalPrice } = currentRestaurantId
    ? calculateCart(currentRestaurantId)
    : { totalItems: 0, totalPrice: 0 }

  // Additional fees
  const deliveryFee = 0.99
  const serviceFee = 0.2
  const tax = totalPrice * 0.08 // Assuming 8% tax
  const grandTotal = totalPrice + deliveryFee + serviceFee + tax

  // Items in cart for display
  const cartItems = []

  if (currentRestaurantId && restaurantCarts[currentRestaurantId]) {
    const { items: itemQuantities, menuCategories } = restaurantCarts[currentRestaurantId]

    if (menuCategories) {
      Object.entries(menuCategories).forEach(([_, categoryItems]) => {
        categoryItems.forEach((item) => {
          const quantity = itemQuantities[item.id] || 0
          if (quantity > 0) {
            cartItems.push({
              id: item.id,
              name: item.name,
              price: item.price,
              quantity,
            })
          }
        })
      })
    }
  }

  const handleCardInputChange = (e) => {
    const { name, value } = e.target
    setCardDetails((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  // Create order - called for both payment methods
  const createOrder = async (paymentId = null) => {
    try {
      // Create order payload
      const orderPayload = {
        userId: user?.id || "guest-user",
        restaurantId: currentRestaurantId,
        items: cartItems.map((item) => ({
          itemId: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
        paymentMethod,
        paymentId, // Will be null for COD orders
        deliveryAddress: userAddress || "No address provided",
        fees: {
          subtotal: totalPrice,
          deliveryFee,
          serviceFee,
          tax,
          total: grandTotal,
        },
      }

      console.log("Creating order with payload:", orderPayload)

      // For testing purposes, we'll skip the actual API call and simulate a successful response
      // This is a temporary solution until the authentication issues are resolved

      // Simulate successful order creation
      const mockOrderData = {
        orderId: "mock-" + Math.floor(Math.random() * 1000000),
        estimatedDelivery: "25-35 min",
        success: true,
      }

      // Try to clear cart, but handle if the function doesn't exist
      try {
        if (typeof clearCart === "function") {
          clearCart(currentRestaurantId)
        } else {
          console.log("clearCart is not available in the cart context")
          // You might want to implement a fallback here
          // For example, you could use localStorage to clear the cart
        }
      } catch (clearError) {
        console.error("Error clearing cart:", clearError)
        // Continue with the checkout process even if clearing the cart fails
      }

      // Navigate to order confirmation page
      navigate("/order-confirmation", {
        state: {
          orderId: mockOrderData.orderId,
          items: cartItems,
          total: grandTotal,
          address: userAddress || "No location detected",
          estimatedDelivery: mockOrderData.estimatedDelivery || "25-35 min",
          paymentMethod: paymentMethod === "cod" ? "Cash on Delivery" : "Credit/Debit Card",
          paymentStatus: paymentMethod === "cod" ? "Payment on Delivery" : "Paid",
        },
      })
    } catch (error) {
      console.error("Order creation error:", error)
      setPaymentError(error.message || "Failed to create order. Please try again.")
      setIsProcessing(false)
    }
  }

  // Process card payment - only called for card payments
  const processCardPayment = async () => {
    try {
      // For testing purposes, we'll skip the actual payment processing
      // and return a mock payment ID
      return "mock-payment-" + Math.floor(Math.random() * 1000000)
    } catch (error) {
      console.error("Payment processing error:", error)
      throw error // Re-throw to be caught by the calling function
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsProcessing(true)
    setPaymentError("")

    try {
      // If payment method is Cash on Delivery, skip payment processing
      if (paymentMethod === "cod") {
        // Create order directly without payment processing
        await createOrder()
      }
      // If payment method is card, validate and process payment first
      else if (paymentMethod === "card") {
        // Validate card details
        if (!cardDetails.cardNumber || !cardDetails.expiryDate || !cardDetails.cvv) {
          setPaymentError("Please fill in all card details")
          setIsProcessing(false)
          return
        }

        // Validate card number format - more lenient validation
        const cardNumberClean = cardDetails.cardNumber.replace(/\s/g, "")
        if (!/^\d{13,19}$/.test(cardNumberClean)) {
          setPaymentError("Invalid card number format. Card number should be 13-19 digits.")
          setIsProcessing(false)
          return
        }

        // Validate expiry date format (MM/YY)
        if (!/^\d{2}\/\d{2}$/.test(cardDetails.expiryDate)) {
          setPaymentError("Invalid expiry date format (use MM/YY)")
          setIsProcessing(false)
          return
        }

        // Validate CVV format
        if (!/^\d{3,4}$/.test(cardDetails.cvv)) {
          setPaymentError("Invalid CVV")
          setIsProcessing(false)
          return
        }

        // Process card payment
        try {
          const paymentId = await processCardPayment()
          // If payment is successful, create the order with payment ID
          await createOrder(paymentId)
        } catch (error) {
          setPaymentError(error.message || "Payment failed. Please check your card details and try again.")
          setIsProcessing(false)
        }
      }
    } catch (error) {
      console.error("Checkout error:", error)
      setPaymentError("An unexpected error occurred. Please try again.")
      setIsProcessing(false)
    }
  }

  // Format card number with spaces
  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "")
    const matches = v.match(/\d{1,19}/g)
    const match = (matches && matches[0]) || ""
    const parts = []

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }

    if (parts.length) {
      return parts.join(" ")
    } else {
      return value
    }
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-16">
      {/* Header */}
      <div className="bg-white sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center">
          <button onClick={() => navigate(-1)} className="mr-4">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-bold">Checkout</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left side - Order summary */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-lg font-bold mb-4">Order Summary</h2>

              {cartItems.length > 0 ? (
                <div className="space-y-4">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-center">
                      <div className="flex items-center">
                        <span className="text-gray-700 font-medium mr-2">{item.quantity}×</span>
                        <span>{item.name}</span>
                      </div>
                      <span className="font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">Your cart is empty</p>
              )}
            </div>

            {/* Delivery Address */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex items-center mb-4">
                <MapPin className="text-gray-700 mr-2 h-5 w-5" />
                <h2 className="text-lg font-bold">Delivery Address</h2>
              </div>
              {loading ? (
                <p className="text-gray-500">Fetching address...</p>
              ) : error ? (
                <p className="text-red-500">{error}</p>
              ) : userAddress ? (
                <p className="text-gray-700">{userAddress}</p>
              ) : (
                <p className="text-gray-500">Address not found</p>
              )}

              <div className="mt-4 flex items-center text-gray-600">
                <Clock className="h-4 w-4 mr-2" />
                <span className="text-sm">Estimated delivery time: 25-35 min</span>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex items-center mb-4">
                <CreditCard className="text-gray-700 mr-2 h-5 w-5" />
                <h2 className="text-lg font-bold">Payment Method</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      value="cod"
                      checked={paymentMethod === "cod"}
                      onChange={() => setPaymentMethod("cod")}
                    />
                    <span>Cash on Delivery</span>
                  </label>
                </div>
                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      value="card"
                      checked={paymentMethod === "card"}
                      onChange={() => setPaymentMethod("card")}
                    />
                    <span>Credit/Debit Card</span>
                  </label>
                </div>

                {paymentMethod === "card" && (
                  <div className="mt-4 space-y-4">
                    <input
                      type="text"
                      name="cardNumber"
                      placeholder="Card Number"
                      value={formatCardNumber(cardDetails.cardNumber)}
                      onChange={handleCardInputChange}
                      className="w-full px-4 py-2 border rounded-md"
                    />
                    <div className="flex space-x-4">
                      <input
                        type="text"
                        name="expiryDate"
                        placeholder="MM/YY"
                        value={cardDetails.expiryDate}
                        onChange={handleCardInputChange}
                        className="w-1/2 px-4 py-2 border rounded-md"
                      />
                      <input
                        type="text"
                        name="cvv"
                        placeholder="CVV"
                        value={cardDetails.cvv}
                        onChange={handleCardInputChange}
                        className="w-1/2 px-4 py-2 border rounded-md"
                      />
                    </div>
                  </div>
                )}
              </div>

              {paymentError && <p className="mt-4 text-red-600 text-sm">{paymentError}</p>}
            </div>
          </div>

          {/* Right side - Payment Summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold mb-4">Payment Summary</h2>
            <div className="space-y-2 text-sm text-gray-700">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>${totalPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Fee</span>
                <span>${deliveryFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Service Fee</span>
                <span>${serviceFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax (8%)</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between font-semibold">
                <span>Total</span>
                <span>${grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={isProcessing || cartItems.length === 0}
              className={`mt-6 w-full py-3 text-white font-bold rounded-md ${
                isProcessing || cartItems.length === 0
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {isProcessing ? "Processing..." : "Place Order"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CheckoutPage
