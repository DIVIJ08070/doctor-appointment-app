// app/payment/failure/PaymentFailureContent.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardLayout } from "@/components/dashboard-layout";

export default function PaymentFailureContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [paymentDetails, setPaymentDetails] = useState<any>(null);

  useEffect(() => {
    const params: any = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });
    
    if (Object.keys(params).length > 0) {
      setPaymentDetails(params);
      localStorage.setItem('lastPaymentStatus', 'failed');
      localStorage.setItem('lastPaymentDetails', JSON.stringify(params));
    }
  }, [searchParams]);

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto py-12">
        <Card className="border-red-200 shadow-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                <XCircle className="w-12 h-12 text-white" />
              </div>
            </div>
            <CardTitle className="text-3xl text-red-700">Payment Failed</CardTitle>
            <CardDescription className="text-lg">
              Your payment could not be processed
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {paymentDetails && (
              <div className="space-y-3 p-4 bg-red-50 rounded-lg">
                <h3 className="font-semibold text-red-800">Payment Details</h3>
                {paymentDetails.error && (
                  <p className="text-sm font-medium text-red-700">
                    Error: {paymentDetails.error}
                  </p>
                )}
                {paymentDetails.txnid && (
                  <p className="text-sm">
                    <span className="font-medium">Transaction ID:</span> {paymentDetails.txnid}
                  </p>
                )}
              </div>
            )}
            
            <div className="space-y-4 p-4 bg-yellow-50 rounded-lg">
              <h3 className="font-semibold text-yellow-800">What to do next?</h3>
              <ul className="space-y-2 text-sm text-gray-700 list-disc pl-5">
                <li>Your appointment has been created but is pending payment</li>
                <li>You can retry the payment from your appointments page</li>
                <li>Or choose to pay at the clinic during your visit</li>
                <li>If amount was deducted, contact support with transaction ID</li>
              </ul>
            </div>
            
            <div className="flex gap-4 pt-4">
              <Button
                onClick={() => router.push("/dashboard/appointments")}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
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
            
            <div className="text-center text-sm text-gray-500">
              <p>Need help? Contact support at support@medify.com</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}