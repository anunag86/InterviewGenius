
import { Card, CardContent } from "@/components/ui/card";

export default function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <Card>
        <CardContent className="pt-6">
          <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
          
          <div className="space-y-6 text-foreground/90">
            <p>At PrepTalk, we value your privacy and are committed to protecting your personal information.</p>
            
            <section className="space-y-2">
              <h2 className="text-xl font-semibold">Information Collection</h2>
              <p>We collect basic profile information (name, email address) through third-party authentication services like LinkedIn or Google solely for authentication purposes. Additionally, we process work experience details from your resume and public work profile from LinkedIn to provide personalized interview preparation advice.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl font-semibold">Use of Information</h2>
              <p>The information we collect is used exclusively to provide you with tailored interview preparation assistance. We do not sell, trade, or rent your personal identification information to others.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl font-semibold">Data Protection</h2>
              <p>We implement appropriate security measures to protect your personal information and ensure it is used only for the intended purposes outlined in this policy.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl font-semibold">Contact Us</h2>
              <p>If you have any questions about your data or this privacy policy, please use our feedback form within the application, and we will respond to your inquiry.</p>
            </section>

            <footer className="text-sm text-muted-foreground pt-6 border-t">
              <p>Last updated: {new Date().toLocaleDateString()}</p>
              <p className="mt-2">- The PrepTalk Team</p>
            </footer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
