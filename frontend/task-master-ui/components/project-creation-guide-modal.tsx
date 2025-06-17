'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Bot, 
  Sparkles, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight,
  MessageSquare,
  Wand2,
  Edit3,
  ArrowRight
} from 'lucide-react';

interface ProjectCreationGuideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinue: () => void;
}

const steps = [
  {
    id: 1,
    icon: FileText,
    title: 'PRDを入力',
    description: 'プロジェクトの要件を記入',
    visual: (
      <div className="relative mx-auto w-48 h-48">
        <div className="absolute inset-0 bg-primary/5 rounded-lg animate-pulse" />
        <div className="absolute inset-2 bg-white rounded border-2 border-primary/20 p-4">
          <div className="space-y-2">
            <div className="h-2 bg-primary/20 rounded animate-pulse" />
            <div className="h-2 bg-primary/20 rounded animate-pulse w-4/5" />
            <div className="h-2 bg-primary/20 rounded animate-pulse w-3/5" />
          </div>
          <FileText className="absolute bottom-3 right-3 w-8 h-8 text-primary/40" />
        </div>
      </div>
    )
  },
  {
    id: 2,
    icon: Bot,
    title: 'AIと対話',
    description: 'AIが詳細を確認',
    visual: (
      <div className="relative mx-auto w-48 h-48 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <Bot className="w-16 h-16 text-primary" />
            <MessageSquare className="absolute -top-2 -right-2 w-6 h-6 text-primary animate-bounce" />
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-1">
          <div className="w-2 h-2 bg-primary/40 rounded-full animate-pulse" />
          <div className="w-2 h-2 bg-primary/40 rounded-full animate-pulse delay-100" />
          <div className="w-2 h-2 bg-primary/40 rounded-full animate-pulse delay-200" />
        </div>
      </div>
    )
  },
  {
    id: 3,
    icon: Sparkles,
    title: 'タスク自動生成',
    description: 'AIがタスクを分解',
    visual: (
      <div className="relative mx-auto w-48 h-48">
        <div className="absolute inset-0 flex items-center justify-center">
          <Wand2 className="w-12 h-12 text-primary animate-pulse" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="grid grid-cols-2 gap-2 mt-12">
            <div className="w-16 h-8 bg-primary/10 rounded border border-primary/20 animate-fadeIn" />
            <div className="w-16 h-8 bg-primary/10 rounded border border-primary/20 animate-fadeIn delay-100" />
            <div className="w-16 h-8 bg-primary/10 rounded border border-primary/20 animate-fadeIn delay-200" />
            <div className="w-16 h-8 bg-primary/10 rounded border border-primary/20 animate-fadeIn delay-300" />
          </div>
        </div>
        <Sparkles className="absolute top-4 right-4 w-6 h-6 text-yellow-500 animate-spin" />
        <Sparkles className="absolute top-8 left-6 w-4 h-4 text-yellow-500 animate-spin delay-200" />
      </div>
    )
  },
  {
    id: 4,
    icon: CheckCircle2,
    title: '確認・編集',
    description: 'タスクを調整して完成',
    visual: (
      <div className="relative mx-auto w-48 h-48 flex items-center justify-center">
        <div className="relative">
          <div className="w-32 h-32 rounded-full border-4 border-primary/20" />
          <CheckCircle2 className="absolute inset-0 m-auto w-16 h-16 text-green-500 animate-scaleIn" />
          <Edit3 className="absolute -bottom-2 -right-2 w-8 h-8 text-primary bg-white rounded-full p-1 shadow-lg" />
        </div>
      </div>
    )
  }
];

export function ProjectCreationGuideModal({
  open,
  onOpenChange,
  onContinue,
}: ProjectCreationGuideModalProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onContinue();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    setCurrentStep(0);
    onOpenChange(false);
  };

  const step = steps[currentStep];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <div className="text-center pt-6">
          <div className="mb-6">
            {step.visual}
          </div>
          
          <h2 className="text-2xl font-semibold mb-2 flex items-center justify-center gap-2">
            <step.icon className="w-6 h-6 text-primary" />
            {step.title}
          </h2>
          
          <p className="text-muted-foreground text-lg">
            {step.description}
          </p>
          
          <div className="flex justify-center gap-1 mt-8 mb-6">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 w-2 rounded-full transition-all duration-300 ${
                  index === currentStep 
                    ? 'bg-primary w-8' 
                    : index < currentStep 
                    ? 'bg-primary/40' 
                    : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>
        
        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button
            variant="ghost"
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            戻る
          </Button>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              スキップ
            </Button>
            <Button onClick={handleNext} className="gap-1">
              {currentStep === steps.length - 1 ? (
                <>
                  始める
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  次へ
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}