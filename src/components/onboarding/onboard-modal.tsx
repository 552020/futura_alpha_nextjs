"use client";

import { useState, useEffect } from "react";
import { useOnboarding } from "@/contexts/onboarding-context";
import { useToast } from "@/hooks/use-toast";
import { setDoc, initSatellite } from "@junobuild/core-peer";
import { trackEventAsync } from "@junobuild/analytics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Upload, User, Share2, CheckCircle } from "lucide-react";

interface OnboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OnboardModal({ isOpen, onClose }: OnboardModalProps) {
  const {
    files,
    addFile,
    currentStep,
    setCurrentStep,
    userData,
    updateUserData,
    setOnboardingStatus,
  } = useOnboarding();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Initialize Juno satellite when component mounts
  // manual init from env var set in yml
  useEffect(() => {
    (async () => {
      try {
        console.log('Initializing Juno satellite with ID:', process.env.NEXT_PUBLIC_JUNO_SATELLITE_ID);
        await initSatellite({ satelliteId: process.env.NEXT_PUBLIC_JUNO_SATELLITE_ID });
      } catch (error) {
        console.error("Failed to initialize Juno satellite:", error);
      }
    })();
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      addFile({
        url,
        file,
        uploadedAt: new Date(),
        fileType: file.type,
      });
      setCurrentStep("user-info");
    }
  };

  const handleNext = async () => {
    setIsLoading(true);

    try {
      switch (currentStep) {
        case "upload":
          // File upload handled by input change
          break;

        case "user-info":
          if (
            !userData.name ||
            !userData.email ||
            !userData.recipientName ||
            !userData.recipientEmail
          ) {
            toast({
              variant: "destructive",
              title: "Missing Information",
              description: "Please fill in all required fields.",
            });
            return;
          }
          setCurrentStep("share");
          break;

        case "share":
          // Send email through Juno serverless function
          try {
            // Get utm_source (segment) from URL search params
            const urlParams = new URLSearchParams(
              typeof window !== 'undefined' ? window.location.search : ''
            );
            const utmSource = urlParams.get('utm_source') || 'unknown';
            
            await setDoc({
              collection: "email_requests",
              doc: {
                key: crypto.randomUUID(),
                data: {
                  from: "noreply@futura.now",
                  to: userData.recipientEmail,
                  subject: `${userData.name} has shared files with you on Futura`,
                  text: "Placeholder text - will be replaced by serverless function",
                  user_name: userData.name,
                  recipient_name: userData.recipientName,
                  segment: utmSource,
                }
              }
            });
            
            // Track successful memory share event
            try {
              
              await trackEventAsync({
                name: "memory_shared",
                metadata: {
                  segment: utmSource,
                  files_count: files.length.toString(),
                  relationship: userData.relationship || '',
                  family_role: userData.familyRelationship || '',
                }
              });
            } catch (trackError) {
              // Don't block the flow if tracking fails
              console.error("Failed to track share event:", trackError);
            }
            
            toast({
              title: "Email Sent!",
              description: `Sharing notification sent to ${userData.recipientName}`,
            });
          } catch (error) {
            console.error("Failed to send email:", error);
            toast({
              variant: "destructive",
              title: "Email Failed",
              description: "Failed to send sharing notification. Please try again.",
            });
            return;
          }
          
          setCurrentStep("complete");
          setOnboardingStatus("completed");
          break;

        case "complete":
          onClose();
          break;
      }
    } catch (error) {
      console.error("Error in onboarding step:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Something went wrong. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case "upload":
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">
                Upload Your First File
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Start by uploading a file to get started with your digital
                vault.
              </p>
            </div>

            <div className="space-y-4">
              <Input
                type="file"
                onChange={handleFileUpload}
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                className="cursor-pointer"
              />

              {files.length > 0 && (
                <div className="rounded-lg border p-4">
                  <p className="text-sm font-medium">Uploaded Files:</p>
                  <ul className="mt-2 space-y-1">
                    {files.map((file, index) => (
                      <li key={index} className="text-sm text-muted-foreground">
                        {file.file.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        );

      case "user-info":
        return (
          <div className="space-y-6">
            <div className="text-center">
              <User className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">
                Tell Us About Yourself
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Help us personalize your experience.
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Your Name</Label>
                  <Input
                    id="name"
                    value={userData.name}
                    onChange={(e) => updateUserData({ name: e.target.value })}
                    placeholder="Enter your name"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Your Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={userData.email}
                    onChange={(e) => updateUserData({ email: e.target.value })}
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="recipientName">Recipient Name</Label>
                  <Input
                    id="recipientName"
                    value={userData.recipientName}
                    onChange={(e) =>
                      updateUserData({ recipientName: e.target.value })
                    }
                    placeholder="Who to share with"
                  />
                </div>
                <div>
                  <Label htmlFor="recipientEmail">Recipient Email</Label>
                  <Input
                    id="recipientEmail"
                    type="email"
                    value={userData.recipientEmail}
                    onChange={(e) =>
                      updateUserData({ recipientEmail: e.target.value })
                    }
                    placeholder="Their email address"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="relationship">Relationship</Label>
                  <Select
                    value={userData.relationship}
                    onValueChange={(value) =>
                      updateUserData({ relationship: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select relationship" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="family">Family</SelectItem>
                      <SelectItem value="friend">Friend</SelectItem>
                      <SelectItem value="colleague">Colleague</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="familyRelationship">Family Role</Label>
                  <Select
                    value={userData.familyRelationship}
                    onValueChange={(value) =>
                      updateUserData({ familyRelationship: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select family role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="parent">Parent</SelectItem>
                      <SelectItem value="child">Child</SelectItem>
                      <SelectItem value="sibling">Sibling</SelectItem>
                      <SelectItem value="spouse">Spouse</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        );

      case "share":
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Share2 className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">Share Your Files</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                We&apos;ll help you share your files with{" "}
                {userData.recipientName}.
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Sharing Summary</CardTitle>
                <CardDescription>
                  Files will be shared with {userData.recipientName} (
                  {userData.recipientEmail})
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm">
                    <strong>Files to share:</strong> {files.length}
                  </p>
                  <p className="text-sm">
                    <strong>Relationship:</strong> {userData.relationship}
                  </p>
                  {userData.relationship === "family" && (
                    <p className="text-sm">
                      <strong>Family role:</strong>{" "}
                      {userData.familyRelationship}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "complete":
        return (
          <div className="space-y-6 text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
            <h3 className="text-lg font-medium">Setup Complete!</h3>
            <p className="text-sm text-muted-foreground">
              Your files have been shared successfully. You can now start using
              your digital vault.
            </p>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">What&apos;s Next?</CardTitle>
              </CardHeader>
              <CardContent className="text-left">
                <ul className="space-y-2 text-sm">
                  <li>• Upload more files to your vault</li>
                  <li>• Share files with other people</li>
                  <li>• Organize your digital memories</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Welcome to Your Digital Vault</DialogTitle>
          <DialogDescription>
            Let&apos;s get you started with your first upload and share.
          </DialogDescription>
        </DialogHeader>

        {renderStep()}

        <div className="flex justify-between pt-6">
          <Button
            variant="outline"
            onClick={() => {
              if (currentStep === "upload") {
                onClose();
              } else if (currentStep === "user-info") {
                setCurrentStep("upload");
              } else if (currentStep === "share") {
                setCurrentStep("user-info");
              }
            }}
            disabled={isLoading}
          >
            {currentStep === "upload" ? "Cancel" : "Back"}
          </Button>

          <Button
            onClick={handleNext}
            disabled={
              isLoading || (currentStep === "upload" && files.length === 0)
            }
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {currentStep === "complete" ? "Get Started" : "Continue"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
