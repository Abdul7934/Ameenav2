


import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import { StudyMaterial, UploadedContent, Quiz } from '../types';
import { LOCAL_STORAGE_CONTENT_KEY, LOCAL_STORAGE_QUIZZES_KEY } from '../constants';

interface UploadedContentContextType {
  studyMaterials: StudyMaterial[];
  addContent: (content: UploadedContent) => void;
  updateStudyMaterial: (materialId: string, updates: Partial<StudyMaterial>) => void;
  getStudyMaterialById: (id: string) => StudyMaterial | undefined;
  addQuizResult: (contentId: string, quizResult: Quiz) => void;
  getQuizzesForContent: (contentId: string) => Quiz[];
}

const UploadedContentContext = createContext<UploadedContentContextType | undefined>(undefined);

export const UploadedContentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [studyMaterials, setStudyMaterials] = useState<StudyMaterial[]>(() => {
    try {
      const savedMaterials = localStorage.getItem(LOCAL_STORAGE_CONTENT_KEY);
      return savedMaterials ? JSON.parse(savedMaterials) : [];
    } catch (error) {
      console.error("Failed to parse study materials from localStorage:", error);
      localStorage.removeItem(LOCAL_STORAGE_CONTENT_KEY); // Clear corrupted data
      return [];
    }
  });

  const [allQuizzes, setAllQuizzes] = useState<Quiz[]>(() => {
    try {
      const savedQuizzes = localStorage.getItem(LOCAL_STORAGE_QUIZZES_KEY);
      return savedQuizzes ? JSON.parse(savedQuizzes) : [];
    } catch (error) {
      console.error("Failed to parse quizzes from localStorage:", error);
      localStorage.removeItem(LOCAL_STORAGE_QUIZZES_KEY); // Clear corrupted data
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_CONTENT_KEY, JSON.stringify(studyMaterials));
  }, [studyMaterials]);
  
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_QUIZZES_KEY, JSON.stringify(allQuizzes));
  }, [allQuizzes]);

  const addContent = useCallback((content: UploadedContent) => {
    const newMaterial: StudyMaterial = { ...content, chatHistory: [] };
    setStudyMaterials(prev => [...prev, newMaterial]);
  }, []);

  const updateStudyMaterial = useCallback((materialId: string, updates: Partial<StudyMaterial>) => {
    setStudyMaterials(prev =>
      prev.map(material =>
        material.id === materialId ? { ...material, ...updates } : material
      )
    );
  }, []);

  const getStudyMaterialById = useCallback((id: string): StudyMaterial | undefined => {
    return studyMaterials.find(material => material.id === id);
  }, [studyMaterials]);

  const addQuizResult = useCallback((contentId: string, quizResult: Quiz) => {
    setAllQuizzes(prevQuizzes => [...prevQuizzes, quizResult]);
  }, []);

  const getQuizzesForContent = useCallback((contentId: string): Quiz[] => {
    return allQuizzes.filter(quiz => quiz.contentId === contentId);
  }, [allQuizzes]);

  return (
    <UploadedContentContext.Provider value={{ studyMaterials, addContent, updateStudyMaterial, getStudyMaterialById, addQuizResult, getQuizzesForContent }}>
      {children}
    </UploadedContentContext.Provider>
  );
};

export const useUploadedContent = (): UploadedContentContextType => {
  const context = useContext(UploadedContentContext);
  if (context === undefined) {
    throw new Error('useUploadedContent must be used within an UploadedContentProvider');
  }
  return context;
};