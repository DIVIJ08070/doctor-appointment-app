// app/payment/success/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardLayout } from "@/components/dashboard-layout";

export default function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [paymentDetails, setPaymentDetails] = useState<any>(null);

  useEffect(() => {
    // Get payment details from URL parameters
    const params: any = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });
    
    if (Object.keys(params).length > 0) {
      setPaymentDetails(params);
      
      // Store payment status in localStorage for reference
      localStorage.setItem('lastPaymentStatus', 'success');
      localStorage.setItem('lastPaymentDetails', JSON.stringify(params));
    }
  }, [searchParams]);

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto py-12">
        <Card className="border-green-200 shadow-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-white" />
              </div>
            </div>
            <CardTitle className="text-3xl text-green-700">Payment Successful!</CardTitle>
            <CardDescription className="text-lg">
              Your appointment has been confirmed
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {paymentDetails && (
              <div className="space-y-3 p-4 bg-green-50 rounded-lg">
                <h3 className="font-semibold text-green-800">Payment Details</h3>
                {paymentDetails.txnid && (
                  <p className="text-sm">
                    <span className="font-medium">Transaction ID:</span> {paymentDetails.txnid}
                  </p>
                )}
                {paymentDetails.amount && (
                  <p className="text-sm">
                    <span className="font-medium">Amount:</span> ₹{paymentDetails.amount}
                  </p>
                )}
                {paymentDetails.productinfo && (
                  <p className="text-sm">
                    <span className="font-medium">Description:</span> {paymentDetails.productinfo}
                  </p>
                )}
              </div>
            )}
            
            <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-800">Next Steps</h3>
              <ul className="space-y-2 text-sm text-gray-700 list-disc pl-5">
                <li>You will receive a confirmation email with appointment details</li>
                <li>Please arrive 10 minutes before your scheduled time</li>
                <li>Carry your ID proof and any previous medical reports</li>
                <li>You can view all your appointments in the appointments section</li>
              </ul>
            </div>
            
            <div className="flex gap-4 pt-4">
              <Button
                onClick={() => router.push("/dashboard/appointments")}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                View Appointments
              </Button>
              <Button
                onClick={() => router.push("/dashboard")}
                variant="outline"
                className="flex-1"
              >
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}