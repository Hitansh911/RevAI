"use client";

import { useUser } from "@clerk/nextjs";
import { QRCodeSVG } from "qrcode.react";
import { useState, useEffect } from "react";
import { Download, Copy, ExternalLink, CheckCircle2 } from "lucide-react";
import { getBusinessProfile } from "@/app/actions";
import { Button } from "@/components/ui/button";

export default function QRGenerator() {
  const { user, isLoaded } = useUser();
  const [businessName, setBusinessName] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [questionsB64, setQuestionsB64] = useState("");

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const biz = await getBusinessProfile(user.id);
        if (biz) {
          setBusinessName(biz.name);
          // Encode questions as Base64 for self-contained review links
          if (biz.questions && Array.isArray(biz.questions) && biz.questions.length > 0) {
            try {
              const encoded = btoa(encodeURIComponent(JSON.stringify(biz.questions)));
              setQuestionsB64(encoded);
            } catch (e) {
              console.error("Failed to encode questions for URL", e);
            }
          }
        }
      } catch (e) {
        console.error("Failed to load business profile", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  if (loading || !isLoaded) {
    return (
      <div className="flex h-[300px] items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );
  }

  const baseUrl = typeof window !== 'undefined' && user ? `${window.location.origin}/review/${user.id}` : '';
  // QR codes have a strict data limit (~4KB). Always use the short URL for QR.
  // For the copy-link, append data param only if it's reasonably short.
  const qrUrl = baseUrl;
  const shareLinkUrl = questionsB64 && questionsB64.length < 1500 ? `${baseUrl}?data=${questionsB64}` : baseUrl;

  const downloadQR = () => {
    const svg = document.getElementById("qr-code");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width + 80;
      canvas.height = img.height + 120;
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 40, 40);
        ctx.fillStyle = "black";
        ctx.font = "bold 24px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Scan to Review", canvas.width / 2, img.height + 80);
      }
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = "review_qr.png";
      downloadLink.href = `${pngFile}`;
      downloadLink.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareLinkUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-x-hidden">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-1">QR Code Generator</h1>
        <p className="text-slate-500 text-sm">Download your QR code or share your unique review link.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* QR Code Display */}
        <section className="flex flex-col items-center justify-center p-6 sm:p-12 text-center bg-white border border-[#E2E0E8] shadow-[0px_10px_30px_rgba(0,0,0,0.04)] rounded-[24px] w-full box-border">
          <div className="bg-white p-4 sm:p-6 rounded-[24px] shadow-sm border border-[#E2E0E8] mb-6 w-full max-w-[280px] mx-auto">
            <QRCodeSVG
              id="qr-code"
              value={qrUrl}
              size={220}
              level={"H"}
              includeMargin={true}
              style={{ width: "100%", height: "auto", maxWidth: "220px", display: "block", margin: "0 auto" }}
            />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">{businessName || "Your Business"}</h2>
          <p className="text-sm text-slate-500 max-w-[250px]">
            Print this QR code and display it at your front desk or on receipts.
          </p>
        </section>

        {/* Actions */}
        <div className="flex flex-col justify-center space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Download QR Code</h3>
            <p className="text-sm text-slate-500 mb-4">
              Get a high-quality PNG image of your QR code ready for printing.
            </p>
            <Button onClick={downloadQR} className="w-full sm:w-auto bg-[#4a47d2] hover:bg-[#332dbc] text-white shadow-md">
              <Download className="w-4 h-4 mr-2" /> Download PNG
            </Button>
          </div>

          <hr className="border-slate-200" />

          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Direct Link</h3>
            <p className="text-sm text-slate-500 mb-4">
              Share this link in emails, SMS, or on your social media profiles.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <div className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 flex items-center justify-between overflow-hidden w-full">
                <span className="text-sm font-medium text-slate-700 truncate min-w-0">{baseUrl}</span>
                <a href={shareLinkUrl} target="_blank" rel="noreferrer" className="text-[#4a47d2] hover:text-[#332dbc] shrink-0 ml-3">
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
              <Button onClick={copyLink} variant={copied ? "secondary" : "outline"} className={`w-full sm:w-auto ${copied ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" : "bg-white hover:bg-slate-50 text-slate-900 border-slate-200"}`}>
                {copied ? <><CheckCircle2 className="w-4 h-4 mr-2" /> Copied</> : <><Copy className="w-4 h-4 mr-2" /> Copy</>}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
