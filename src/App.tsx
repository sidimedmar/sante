/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MapPin, 
  User, 
  Phone, 
  GraduationCap, 
  Briefcase, 
  BookOpen, 
  Send, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2,
  FileSpreadsheet,
  Building2,
  Stethoscope,
  AlertCircle,
  Download,
  Lock,
  LogOut,
  ShieldCheck,
  UserCircle,
  Trash2,
  Edit2,
  Plus,
  Search,
  FileUp,
  Loader2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { db, auth } from './firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut, 
  signInAnonymously,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import type { FormState } from './types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
  }
}

const MAURITANIA_REGIONS: Record<string, string[]> = {
  "نواكشوط الغربية (Nouakchott Ouest)": ["تفرغ زينة (Tevragh Zeina)", "القصر (Ksar)", "السبخة (Sebkha)"],
  "نواكشوط الشمالية (Nouakchott Nord)": ["دار النعيم (Dar Naim)", "تيارت (Teyarett)", "توجونين (Toujounine)"],
  "نواكشوط الجنوبية (Nouakchott Sud)": ["عرفات (Arafat)", "الميناء (El Mina)", "الرياض (Riyad)"],
  "الحوض الشرقي": ["النعمة", "تمبدغة", "آمرج", "باسكنو", "جكني", "ولاته", "ظهر"],
  "الحوض الغربي": ["لعيون", "الطينطان", "تامشكط", "كوبني"],
  "لعصابه": ["كيفة", "كنكوصة", "بومديد", "باركيول", "كرو"],
  "كوركول": ["كيهيدي", "مقامه", "أمبود", "مونكل"],
  "لبراكنه": ["ألاك", "بوكى", "مقاطع لحجار", "بابابى", "امباني"],
  "الترارزة": ["روصو", "المذرذرة", "بوتلميت", "اركيز", "كرمسين", "تكنت"],
  "آدرار": ["أطار", "شنقيط", "وادان", "أوجفت"],
  "داخلت نواذيبو": ["نواذيبو", "الشامي"],
  "تكانت": ["تجكجة", "المجرية", "تيشيت"],
  "كيدي ماغا": ["سيلبابي", "ولد ينج"],
  "تيرس زمور": ["الزويرات", "افديرك", "بير أم اكرين"],
  "إينشيري": ["أكجوجت"]
};

const STEPS = [
  { id: 'personal', title: 'المعلومات الشخصية', icon: User },
  { id: 'professional', title: 'المسار المهني', icon: Briefcase },
  { id: 'assessment', title: 'تحديد المستوى المعارفي', icon: BookOpen },
];

type UserRole = 'admin' | 'user' | null;

export default function App() {
  const [role, setRole] = useState<UserRole>(null);
  const [user, setUser] = useState<any>(null);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [step, setStep] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);
  const [formData, setFormData] = useState<FormState>({
    wilaya: '',
    moughataa: '',
    name: '',
    whatsapp: '',
    educationLevel: '',
    lastCertificate: '',
    field: '',
    yearsOfService: '',
    location: { latitude: null, longitude: null },
    q1: '',
    q2: ['', ''],
    q3: ['', ''],
    q4: ['', '', ''],
    q5: ['', ''],
    q6: ['', '', ''],
    q7: ['', ''],
  });

  const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
    const errInfo: FirestoreErrorInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
        isAnonymous: auth.currentUser?.isAnonymous,
      },
      operationType,
      path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    alert("حدث خطأ أثناء حفظ البيانات. يرجى التحقق من الاتصال.");
    throw new Error(JSON.stringify(errInfo));
  };

  useEffect(() => {
    const testConnection = async () => {
      try {
        const { getDocFromServer, doc } = await import('firebase/firestore');
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. The client is offline.");
        }
      }
    };
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (role === 'admin' && auth.currentUser) {
      const q = query(collection(db, 'submissions'), orderBy('submittedAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setSubmissions(data);
      }, (error) => {
        console.error("Snapshot listener error:", error);
        if (error.code === 'permission-denied') {
          // If permission denied, maybe the auth state is stale or user isn't admin
          setRole(null);
          setLoginError('انتهت صلاحية الجلسة أو ليس لديك صلاحيات المسؤول');
        }
      });
      return () => unsubscribe();
    }
  }, [role, user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError('');
    try {
      if (loginData.username === 'admin' && loginData.password === 'admin125') {
        // Admin must sign in with Google FIRST to verify identity
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        
        if (result.user.email === 'sidiahm@gmail.com') {
          setRole('admin');
          setLoginError('');
        } else {
          setLoginError('هذا الحساب ليس لديه صلاحيات المسؤول');
          await signOut(auth);
        }
      } else if (loginData.username === 'user' && loginData.password === 'user2026') {
        setRole('user');
        setLoginError('');
      } else {
        setLoginError('اسم المستخدم أو كلمة المرور غير صحيحة');
      }
    } catch (error: any) {
      console.error("Login error:", error);
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        setLoginError('تم إلغاء عملية تسجيل الدخول. يرجى المحاولة مرة أخرى وعدم إغلاق النافذة المنبثقة.');
      } else if (error.code === 'auth/admin-restricted-operation') {
        setLoginError('هذه العملية مقيدة. يرجى استخدام زر "الدخول عبر جوجل" المخصص للمدراء.');
      } else if (error.code === 'auth/popup-blocked') {
        setLoginError('تم حظر النافذة المنبثقة. يرجى السماح بالنوافذ المنبثقة لهذا الموقع.');
      } else {
        setLoginError('فشل الاتصال بالخادم: ' + (error.message || 'خطأ غير معروف'));
      }
    }
    setIsLoading(false);
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setLoginError('');
    try {
      const provider = new GoogleAuthProvider();
      // Add custom parameters to force account selection if needed
      provider.setCustomParameters({ prompt: 'select_account' });
      
      const result = await signInWithPopup(auth, provider);
      if (result.user.email === 'sidiahm@gmail.com') {
        setRole('admin');
        setLoginError('');
      } else {
        setRole('user');
        // Optional: you might want to sign out if they aren't the intended admin
        // await signOut(auth);
      }
    } catch (error: any) {
      console.error("Google login error:", error);
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        setLoginError('تم إغلاق نافذة تسجيل الدخول. يرجى المحاولة مرة أخرى.');
      } else if (error.code === 'auth/popup-blocked') {
        setLoginError('يرجى السماح بالنوافذ المنبثقة في متصفحك لإتمام تسجيل الدخول.');
      } else {
        setLoginError('فشل تسجيل الدخول عبر جوجل. يرجى المحاولة لاحقاً.');
      }
    }
    setIsLoading(false);
  };

  const handleLogout = async () => {
    await signOut(auth);
    setRole(null);
    setLoginData({ username: '', password: '' });
    setStep(0);
    setIsSubmitted(false);
  };

  const validateStep = (currentStep: number) => {
    const newErrors: Record<string, string> = {};
    
    if (currentStep === 0) {
      if (!formData.wilaya) newErrors.wilaya = "يرجى اختيار الولاية";
      if (!formData.moughataa) newErrors.moughataa = "يرجى اختيار المقاطعة";
      if (!formData.name || formData.name.length < 3) newErrors.name = "الاسم يجب أن يكون 3 أحرف على الأقل";
      if (!formData.whatsapp || !/^[234]\d{7}$/.test(formData.whatsapp)) {
        newErrors.whatsapp = "رقم الوتساب يجب أن يبدأ بـ 2 أو 3 أو 4 ويتكون من 8 أرقام";
      }
    } else if (currentStep === 1) {
      if (!formData.educationLevel) newErrors.educationLevel = "يرجى اختيار المستوى الدراسي";
      if (!formData.lastCertificate) newErrors.lastCertificate = "يرجى إدخال آخر شهادة";
      if (!formData.field) newErrors.field = "يرجى إدخال المجال";
      if (!formData.yearsOfService || parseInt(formData.yearsOfService) < 0) {
        newErrors.yearsOfService = "يرجى إدخال عدد سنوات خدمة صحيح";
      }
    } else if (currentStep === 2) {
      if (!formData.q1.trim()) newErrors.q1 = "يرجى إدخال تعريف الاتصال العام";
      if (formData.q2.some(v => !v.trim())) newErrors.q2 = "يرجى ملء جميع مقاربات الاتصال";
      if (formData.q3.some(v => !v.trim())) newErrors.q3 = "يرجى ملء جميع استراتيجيات الاتصال";
      if (formData.q4.some(v => !v.trim())) newErrors.q4 = "يرجى ملء جميع تقنيات الاتصال";
      if (formData.q5.some(v => !v.trim())) newErrors.q5 = "يرجى ملء جميع أنواع الوسائط";
      if (formData.q6.some(v => !v.trim())) newErrors.q6 = "يرجى ملء جميع قدرات المنعش";
      if (formData.q7.some(v => !v.trim())) newErrors.q7 = "يرجى ملء جميع مراحل تغيير السلوك";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setFormData(prev => ({
          ...prev,
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }
        }));
      }, (err) => {
        alert('فشل في الحصول على الموقع: ' + err.message);
      });
    }
  };

  const updateArrayField = (field: keyof FormState, index: number, value: string) => {
    setFormData(prev => {
      const arr = [...(prev[field] as string[])];
      arr[index] = value;
      return { ...prev, [field]: arr };
    });
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(s => Math.min(s + 1, STEPS.length - 1));
    }
  };
  const prevStep = () => setStep(s => Math.max(s - 1, 0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep(step)) {
      setIsLoading(true);
      try {
        const dataToSave = {
          ...formData,
          submittedAt: serverTimestamp(),
          role: role
        };

        if (editingId) {
          await updateDoc(doc(db, 'submissions', editingId), dataToSave);
          setEditingId(null);
          setShowAdminPanel(true);
        } else {
          await addDoc(collection(db, 'submissions'), dataToSave);
        }
        
        setIsSubmitted(true);
        setFormData({
          wilaya: '',
          moughataa: '',
          name: '',
          whatsapp: '',
          educationLevel: '',
          lastCertificate: '',
          field: '',
          yearsOfService: '',
          location: { latitude: null, longitude: null },
          q1: '',
          q2: ['', ''],
          q3: ['', ''],
          q4: ['', '', ''],
          q5: ['', ''],
          q6: ['', '', ''],
          q7: ['', ''],
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, editingId ? `submissions/${editingId}` : 'submissions');
      }
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذه الاستمارة؟')) {
      try {
        await deleteDoc(doc(db, 'submissions', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `submissions/${id}`);
      }
    }
  };

  const handleEdit = (submission: any) => {
    setFormData({
      wilaya: submission.wilaya,
      moughataa: submission.moughataa,
      name: submission.name,
      whatsapp: submission.whatsapp,
      educationLevel: submission.educationLevel,
      lastCertificate: submission.lastCertificate,
      field: submission.field,
      yearsOfService: submission.yearsOfService,
      location: submission.location || { latitude: null, longitude: null },
      q1: submission.q1,
      q2: submission.q2,
      q3: submission.q3,
      q4: submission.q4,
      q5: submission.q5,
      q6: submission.q6,
      q7: submission.q7,
    });
    setEditingId(submission.id);
    setShowAdminPanel(false);
    setStep(0);
    setIsSubmitted(false);
  };

  const exportAllToExcel = () => {
    const data = submissions.map(s => ({
      'الاسم': s.name,
      'الولاية': s.wilaya,
      'المقاطعة': s.moughataa,
      'الوتساب': s.whatsapp,
      'المستوى الدراسي': s.educationLevel,
      'آخر شهادة': s.lastCertificate,
      'المجال': s.field,
      'سنوات الخدمة': s.yearsOfService,
      'تاريخ الإرسال': s.submittedAt?.toDate().toLocaleString('ar-MR'),
      'تعريف الاتصال': s.q1,
      'مقاربة ١': s.q2?.[0] || '',
      'مقاربة ٢': s.q2?.[1] || '',
      'استراتيجية ١': s.q3?.[0] || '',
      'استراتيجية ٢': s.q3?.[1] || '',
      'تقنية ١': s.q4?.[0] || '',
      'تقنية ٢': s.q4?.[1] || '',
      'تقنية ٣': s.q4?.[2] || '',
      'وسيط ١': s.q5?.[0] || '',
      'وسيط ٢': s.q5?.[1] || '',
      'قدرة ١': s.q6?.[0] || '',
      'قدرة ٢': s.q6?.[1] || '',
      'قدرة ٣': s.q6?.[2] || '',
      'مرحلة ١': s.q7?.[0] || '',
      'مرحلة ٢': s.q7?.[1] || '',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Evaluations");
    XLSX.writeFile(wb, "All_Evaluations.xlsx");
  };

  const importFromExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws) as any[];
      
      setIsLoading(true);
      let count = 0;
      try {
        for (const row of data) {
          const importData = {
            name: row['الاسم'] || '',
            wilaya: row['الولاية'] || '',
            moughataa: row['المقاطعة'] || '',
            whatsapp: String(row['الوتساب'] || ''),
            educationLevel: row['المستوى الدراسي'] || '',
            lastCertificate: row['آخر شهادة'] || '',
            field: row['المجال'] || '',
            yearsOfService: String(row['سنوات الخدمة'] || '0'),
            q1: row['تعريف الاتصال'] || '',
            q2: [row['مقاربة ١'] || '', row['مقاربة ٢'] || ''],
            q3: [row['استراتيجية ١'] || '', row['استراتيجية ٢'] || ''],
            q4: [row['تقنية ١'] || '', row['تقنية ٢'] || '', row['تقنية ٣'] || ''],
            q5: [row['وسيط ١'] || '', row['وسيط ٢'] || ''],
            q6: [row['قدرة ١'] || '', row['قدرة ٢'] || '', row['قدرة ٣'] || ''],
            q7: [row['مرحلة ١'] || '', row['مرحلة ٢'] || ''],
            location: { latitude: null, longitude: null },
            submittedAt: serverTimestamp(),
            role: 'admin'
          };
          await addDoc(collection(db, 'submissions'), importData);
          count++;
        }
        alert(`تم استيراد ${count} سجل بنجاح`);
      } catch (error) {
        console.error("Import error:", error);
        alert("حدث خطأ أثناء الاستيراد. يرجى التأكد من صيغة الملف.");
      }
      setIsLoading(false);
    };
    reader.readAsBinaryString(file);
  };

  const downloadXlsForm = () => {
    const survey = [
      ["type", "name", "label", "hint", "required"],
      ["start", "start", "", "", ""],
      ["end", "end", "", "", ""],
      ["today", "today", "", "", ""],
      ["deviceid", "deviceid", "", "", ""],
      ["select_one wilaya_list", "wilaya", "الولاية", "", "yes"],
      ["select_one moughataa_list", "moughataa", "المقاطعة", "", "yes"],
      ["text", "name", "الاسم", "", "yes"],
      ["text", "whatsapp", "الوتساب", "8 أرقام تبدأ بـ 2 أو 3 أو 4", "yes"],
      ["select_one education_level", "education_level", "المستوى الدراسي", "", "yes"],
      ["text", "last_cert", "آخر شهادة", "", "yes"],
      ["text", "field", "المجال", "", "yes"],
      ["integer", "service_years", "عدد سنوات الخدمة في البرنامج", "", "yes"],
      ["geopoint", "location", "حدد المكان عن طريق كوكل", "", "no"],
      ["text", "q1", "١. عرف الاتصال العام", "", "yes"],
      ["text", "q2_1", "٢. اذكر أثنتين من مقاربات الاتصال - ١", "", "yes"],
      ["text", "q2_2", "٢. اذكر أثنتين من مقاربات الاتصال - ٢", "", "yes"],
      ["text", "q3_1", "٣. اذكر اثنتين من استراتيجيات الاتصال - ١", "", "yes"],
      ["text", "q3_2", "٣. اذكر اثنتين من استراتيجيات الاتصال - ٢", "", "yes"],
      ["text", "q4_1", "٤. اذكر ثلاثة من تقنيات الاتصال البيني - ١", "", "yes"],
      ["text", "q4_2", "٤. اذكر ثلاثة من تقنيات الاتصال البيني - ٢", "", "yes"],
      ["text", "q4_3", "٤. اذكر ثلاثة من تقنيات الاتصال البيني - ٣", "", "yes"],
      ["text", "q5_1", "٥. اذكر اثنتين من أنواع الوسائط الاتصالية - ١", "", "yes"],
      ["text", "q5_2", "٥. اذكر اثنتين من أنواع الوسائط الاتصالية - ٢", "", "yes"],
      ["text", "q6_1", "٦. اذكر ثلاثة من قدرات المنعش أو المسهل - ١", "", "yes"],
      ["text", "q6_2", "٦. اذكر ثلاثة من قدرات المنعش أو المسهل - ٢", "", "yes"],
      ["text", "q6_3", "٦. اذكر ثلاثة من قدرات المنعش أو المسهل - ٣", "", "yes"],
      ["text", "q7_1", "٧. اذكر اثنتين من مراحل تغيير السلوك - ١", "", "yes"],
      ["text", "q7_2", "٧. اذكر اثنتين من مراحل تغيير السلوك - ٢", "", "yes"]
    ];

    const choices = [
      ["list_name", "name", "label"],
      ...Object.keys(MAURITANIA_REGIONS).map(r => ["wilaya_list", r.replace(/\s/g, '_'), r]),
      ...Object.entries(MAURITANIA_REGIONS).flatMap(([r, ms]) => ms.map(m => ["moughataa_list", m.replace(/\s/g, '_'), m])),
      ["education_level", "bac", "باكالوريا"],
      ["education_level", "licence", "ليسانس"],
      ["education_level", "master", "ماستر"],
      ["education_level", "doctorate", "دكتوراه"],
      ["education_level", "other", "أخرى"]
    ];

    const wb = XLSX.utils.book_new();
    const wsSurvey = XLSX.utils.aoa_to_sheet(survey);
    const wsChoices = XLSX.utils.aoa_to_sheet(choices);
    const wsSettings = XLSX.utils.aoa_to_sheet([["form_title", "form_id"], ["تحديد الحاجيات التكوينية", "training_needs_mr"]]);

    XLSX.utils.book_append_sheet(wb, wsSurvey, "survey");
    XLSX.utils.book_append_sheet(wb, wsChoices, "choices");
    XLSX.utils.book_append_sheet(wb, wsSettings, "settings");

    XLSX.writeFile(wb, "Training_Needs_Form.xlsx");
  };

  if (!role) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans" dir="rtl">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full space-y-8"
        >
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-green-700 rounded-full flex items-center justify-center mx-auto shadow-lg">
              <Building2 className="w-10 h-10 text-yellow-400" />
            </div>
            <div className="space-y-1">
              <h1 className="text-xl font-bold text-slate-800">تسجيل الدخول</h1>
              <p className="text-slate-500 text-sm">البرنامج الوطني للتثقيف الصحي</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 block">اسم المستخدم</label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="text" 
                    className="w-full pr-10 pl-4 py-3 rounded-xl border border-slate-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
                    value={loginData.username}
                    onChange={e => setLoginData({...loginData, username: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 block">كلمة المرور</label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="password" 
                    className="w-full pr-10 pl-4 py-3 rounded-xl border border-slate-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
                    value={loginData.password}
                    onChange={e => setLoginData({...loginData, password: e.target.value})}
                    required
                  />
                </div>
              </div>
            </div>

            {loginError && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center space-x-2 space-x-reverse">
                <AlertCircle className="w-4 h-4" />
                <span>{loginError}</span>
              </div>
            )}

            <button 
              type="submit"
              className="w-full py-4 bg-green-700 text-white rounded-xl font-bold hover:bg-green-800 transition-all shadow-md flex items-center justify-center space-x-2 space-x-reverse"
            >
              <span>دخول</span>
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ChevronLeft className="w-5 h-5" />}
            </button>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-4 text-slate-500 font-medium">دخول المسؤولين (Admin)</span>
              </div>
            </div>

            <button 
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full py-3 bg-white border-2 border-green-600 text-green-700 rounded-xl font-bold hover:bg-green-50 transition-all flex items-center justify-center space-x-3 space-x-reverse shadow-sm disabled:opacity-50"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
              <span>الدخول الآمن عبر جوجل</span>
            </button>
          </form>

          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
            <p className="text-blue-700 text-xs text-center font-medium">
              حساب المستخدم: user / user2026
            </p>
          </div>
        </motion.div>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap');
          body { font-family: 'Cairo', sans-serif; }
        `}</style>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-6"
        >
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">تم إرسال البيانات بنجاح</h2>
          <p className="text-slate-600">شكراً لمشاركتكم. سيتم مراجعة احتياجاتكم التكوينية قريباً.</p>
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => {
                setIsSubmitted(false);
                setEditingId(null);
              }}
              className="w-full py-3 bg-green-700 text-white rounded-xl font-bold hover:bg-green-800 transition-colors"
            >
              إرسال استمارة أخرى
            </button>
            {role === 'admin' && (
              <button 
                onClick={() => {
                  setIsSubmitted(false);
                  setShowAdminPanel(true);
                }}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
              >
                العودة للوحة التحكم
              </button>
            )}
            <button 
              onClick={handleLogout}
              className="w-full py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans" dir="rtl">
      {/* View Modal */}
      <AnimatePresence>
        {selectedSubmission && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" dir="rtl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-green-700 text-white">
                <div className="flex items-center gap-3">
                  <UserCircle className="w-6 h-6 text-yellow-400" />
                  <h3 className="text-xl font-bold">{selectedSubmission.name}</h3>
                </div>
                <button 
                  onClick={() => setSelectedSubmission(null)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-8 text-right">
                {/* Personal & Professional */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase">الولاية / المقاطعة</label>
                    <p className="text-slate-700 font-medium">{selectedSubmission.wilaya} - {selectedSubmission.moughataa}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase">الوتساب</label>
                    <p className="text-slate-700 font-medium">{selectedSubmission.whatsapp}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase">المستوى الدراسي</label>
                    <p className="text-slate-700 font-medium">{selectedSubmission.educationLevel}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase">سنوات الخدمة</label>
                    <p className="text-slate-700 font-medium">{selectedSubmission.yearsOfService} سنة</p>
                  </div>
                </section>

                <hr className="border-slate-100" />

                {/* Assessment Questions */}
                <div className="space-y-6">
                  <h4 className="font-bold text-green-700 flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    <span>نتائج التقييم المعارفي</span>
                  </h4>
                  
                  <div className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-xl">
                      <p className="text-xs font-bold text-slate-500 mb-2">١. تعريف الاتصال العام:</p>
                      <p className="text-slate-800 leading-relaxed">{selectedSubmission.q1 || '---'}</p>
                    </div>

                    {[
                      { label: '٢. مقاربات الاتصال', data: selectedSubmission.q2 },
                      { label: '٣. استراتيجيات الاتصال', data: selectedSubmission.q3 },
                      { label: '٤. تقنيات الاتصال البيني', data: selectedSubmission.q4 },
                      { label: '٥. أنواع الوسائط الاتصالية', data: selectedSubmission.q5 },
                      { label: '٦. قدرات المنعش أو المسهل', data: selectedSubmission.q6 },
                      { label: '٧. مراحل تغيير السلوك', data: selectedSubmission.q7 },
                    ].map((q, idx) => (
                      <div key={idx} className="bg-slate-50 p-4 rounded-xl">
                        <p className="text-xs font-bold text-slate-500 mb-2">{q.label}:</p>
                        <ul className="list-disc list-inside space-y-1 text-slate-800">
                          {q.data?.map((item: string, i: number) => (
                            <li key={i}>{item || '---'}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedSubmission.location?.latitude && (
                  <div className="pt-4">
                    <a 
                      href={`https://www.google.com/maps?q=${selectedSubmission.location.latitude},${selectedSubmission.location.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-3 bg-blue-50 text-blue-700 rounded-xl font-bold hover:bg-blue-100 transition-colors"
                    >
                      <MapPin className="w-5 h-5" />
                      <span>عرض الموقع على الخريطة</span>
                    </a>
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                <button 
                  onClick={() => {
                    handleEdit(selectedSubmission);
                    setSelectedSubmission(null);
                  }}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>تعديل البيانات</span>
                </button>
                <button 
                  onClick={() => setSelectedSubmission(null)}
                  className="px-8 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-100 transition-colors"
                >
                  إغلاق
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="bg-green-700 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3 space-x-reverse">
            <Building2 className="w-8 h-8 text-yellow-400" />
            <div className="text-right leading-tight">
              <h1 className="text-sm font-bold">وزارة الصحة</h1>
              <p className="text-xs opacity-80">البرنامج الوطني للتثقيف الصحي</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4 space-x-reverse">
            {role === 'admin' && (
              <button 
                onClick={() => setShowAdminPanel(!showAdminPanel)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  showAdminPanel ? 'bg-yellow-400 text-green-900' : 'bg-white/10 text-white'
                }`}
              >
                {showAdminPanel ? 'العودة للاستمارة' : 'لوحة التحكم'}
              </button>
            )}
            <div className="hidden md:flex items-center space-x-2 space-x-reverse bg-white/10 px-3 py-1.5 rounded-full">
              {role === 'admin' ? <ShieldCheck className="w-4 h-4 text-yellow-400" /> : <UserCircle className="w-4 h-4 text-white" />}
              <span className="text-xs font-bold">{role === 'admin' ? 'مدير النظام' : 'مستخدم'}</span>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/80 hover:text-white"
              title="تسجيل الخروج"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {showAdminPanel && role === 'admin' ? (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="بحث بالاسم أو المقاطعة..."
                  className="w-full pr-10 pl-4 py-2 rounded-xl border border-slate-200 focus:border-green-500 outline-none"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={exportAllToExcel}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all text-sm font-bold"
                >
                  <Download className="w-4 h-4" />
                  <span>تصدير الكل</span>
                </button>
                <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all text-sm font-bold cursor-pointer">
                  <FileUp className="w-4 h-4" />
                  <span>استيراد</span>
                  <input type="file" className="hidden" onChange={importFromExcel} accept=".xlsx, .xls" />
                </label>
                <button 
                  onClick={() => {
                    setFormData({
                      wilaya: '', moughataa: '', name: '', whatsapp: '', educationLevel: '', lastCertificate: '', field: '', yearsOfService: '',
                      location: { latitude: null, longitude: null }, q1: '', q2: ['', ''], q3: ['', ''], q4: ['', '', ''], q5: ['', ''], q6: ['', '', ''], q7: ['', ''],
                    });
                    setEditingId(null);
                    setShowAdminPanel(false);
                    setStep(0);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-xl hover:bg-yellow-600 transition-all text-sm font-bold"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة جديد</span>
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-sm font-bold text-slate-600">الاسم</th>
                      <th className="px-6 py-4 text-sm font-bold text-slate-600">الولاية/المقاطعة</th>
                      <th className="px-6 py-4 text-sm font-bold text-slate-600">التاريخ</th>
                      <th className="px-6 py-4 text-sm font-bold text-slate-600">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {submissions
                      .filter(s => s.name?.toLowerCase().includes(searchTerm.toLowerCase()) || s.moughataa?.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-800">{s.name}</div>
                          <div className="text-xs text-slate-500">{s.whatsapp}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-slate-700">{s.wilaya}</div>
                          <div className="text-xs text-slate-500">{s.moughataa}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {s.submittedAt?.toDate().toLocaleDateString('ar-MR')}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => setSelectedSubmission(s)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="عرض التفاصيل"
                            >
                              <Search className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleEdit(s)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="تعديل"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDelete(s.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="حذف"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {submissions.length === 0 && (
                <div className="p-12 text-center text-slate-400">
                  لا توجد بيانات حالياً
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="text-center mb-10 space-y-2">
              <h2 className="text-2xl font-bold text-slate-800">تحديد الحاجيات التكوينية في مجال الاتصال</h2>
              <p className="text-slate-500">خاص بعمال البرنامج الوطني للتثقيف الصحي</p>
            </div>
            {/* Progress Bar */}
        <div className="mb-8 flex justify-between items-center relative">
          <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-200 -translate-y-1/2 z-0" />
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = i <= step;
            return (
              <div key={s.id} className="relative z-10 flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isActive ? 'bg-green-600 text-white shadow-lg scale-110' : 'bg-white text-slate-400 border-2 border-slate-200'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className={`text-xs mt-2 font-bold ${isActive ? 'text-green-700' : 'text-slate-400'}`}>
                  {s.title}
                </span>
              </div>
            );
          })}
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <form onSubmit={handleSubmit}>
            <div className="p-6 md:p-8">
              <AnimatePresence mode="wait">
                {step === 0 && (
                  <motion.div
                    key="step0"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField label="الولاية" icon={MapPin} error={errors.wilaya}>
                        <select 
                          className={`form-input ${errors.wilaya ? 'border-red-500 ring-red-100' : ''}`}
                          value={formData.wilaya}
                          onChange={e => setFormData({...formData, wilaya: e.target.value, moughataa: ''})}
                          required
                        >
                          <option value="">اختر الولاية</option>
                          {Object.keys(MAURITANIA_REGIONS).map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </FormField>

                      <FormField label="المقاطعة" icon={MapPin} error={errors.moughataa}>
                        <select 
                          className={`form-input ${errors.moughataa ? 'border-red-500 ring-red-100' : ''}`}
                          value={formData.moughataa}
                          onChange={e => setFormData({...formData, moughataa: e.target.value})}
                          disabled={!formData.wilaya}
                          required
                        >
                          <option value="">اختر المقاطعة</option>
                          {formData.wilaya && MAURITANIA_REGIONS[formData.wilaya].map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </FormField>

                      <FormField label="الاسم" icon={User} error={errors.name}>
                        <input 
                          type="text" 
                          className={`form-input ${errors.name ? 'border-red-500 ring-red-100' : ''}`}
                          value={formData.name}
                          onChange={e => setFormData({...formData, name: e.target.value})}
                          placeholder="الاسم الكامل"
                          required
                        />
                      </FormField>

                      <FormField label="الوتساب" icon={Phone} error={errors.whatsapp}>
                        <input 
                          type="tel" 
                          className={`form-input ${errors.whatsapp ? 'border-red-500 ring-red-100' : ''}`}
                          value={formData.whatsapp}
                          onChange={e => setFormData({...formData, whatsapp: e.target.value})}
                          placeholder="مثال: 44123456"
                          required
                        />
                      </FormField>
                    </div>
                  </motion.div>
                )}

                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField label="المستوى الدراسي" icon={GraduationCap} error={errors.educationLevel}>
                        <select 
                          className={`form-input ${errors.educationLevel ? 'border-red-500 ring-red-100' : ''}`}
                          value={formData.educationLevel}
                          onChange={e => setFormData({...formData, educationLevel: e.target.value})}
                          required
                        >
                          <option value="">اختر المستوى</option>
                          <option value="bac">باكالوريا</option>
                          <option value="licence">ليسانس</option>
                          <option value="master">ماستر</option>
                          <option value="doctorate">دكتوراه</option>
                          <option value="other">أخرى</option>
                        </select>
                      </FormField>
                      <FormField label="آخر شهادة" icon={FileSpreadsheet} error={errors.lastCertificate}>
                        <input 
                          type="text" 
                          className={`form-input ${errors.lastCertificate ? 'border-red-500 ring-red-100' : ''}`}
                          value={formData.lastCertificate}
                          onChange={e => setFormData({...formData, lastCertificate: e.target.value})}
                          required
                        />
                      </FormField>
                      <FormField label="المجال" icon={Stethoscope} error={errors.field}>
                        <input 
                          type="text" 
                          className={`form-input ${errors.field ? 'border-red-500 ring-red-100' : ''}`}
                          value={formData.field}
                          onChange={e => setFormData({...formData, field: e.target.value})}
                          required
                        />
                      </FormField>
                      <FormField label="عدد سنوات الخدمة في البرنامج" icon={Briefcase} error={errors.yearsOfService}>
                        <input 
                          type="number" 
                          className={`form-input ${errors.yearsOfService ? 'border-red-500 ring-red-100' : ''}`}
                          value={formData.yearsOfService}
                          onChange={e => setFormData({...formData, yearsOfService: e.target.value})}
                          min="0"
                          required
                        />
                      </FormField>
                    </div>
                    
                    <div className="pt-4">
                      <button 
                        type="button"
                        onClick={handleLocation}
                        className={`flex items-center justify-center space-x-2 space-x-reverse w-full py-4 rounded-xl border-2 transition-all ${
                          formData.location.latitude 
                            ? 'bg-green-50 border-green-500 text-green-700' 
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-green-300'
                        }`}
                      >
                        <MapPin className="w-5 h-5" />
                        <span className="font-bold">
                          {formData.location.latitude ? 'تم تحديد الموقع بنجاح' : 'حدد المكان عن طريق كوكل'}
                        </span>
                      </button>
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-8"
                  >
                    <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200 mb-6">
                      <h5 className="text-yellow-800 font-bold flex items-center space-x-2 space-x-reverse">
                        <BookOpen className="w-5 h-5" />
                        <span>أسئلة تحديد المستوى المعارفي:</span>
                      </h5>
                    </div>

                    <div className="space-y-8">
                      <QuestionBlock label="١. عرف الاتصال العام" error={errors.q1}>
                        <textarea 
                          className={`form-input min-h-[100px] ${errors.q1 ? 'border-red-500' : ''}`}
                          value={formData.q1}
                          onChange={e => setFormData({...formData, q1: e.target.value})}
                          placeholder="اكتب تعريفك هنا..."
                        />
                      </QuestionBlock>

                      <QuestionBlock label="٢. اذكر أثنتين من مقاربات الاتصال" error={errors.q2}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {formData.q2.map((val, i) => (
                            <input 
                              key={i}
                              type="text" 
                              className={`form-input ${errors.q2 ? 'border-red-500' : ''}`}
                              value={val}
                              onChange={e => updateArrayField('q2', i, e.target.value)}
                              placeholder={`${i + 1}.`}
                            />
                          ))}
                        </div>
                      </QuestionBlock>

                      <QuestionBlock label="٣. اذكر اثنتين من استراتيجيات الاتصال" error={errors.q3}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {formData.q3.map((val, i) => (
                            <input 
                              key={i}
                              type="text" 
                              className={`form-input ${errors.q3 ? 'border-red-500' : ''}`}
                              value={val}
                              onChange={e => updateArrayField('q3', i, e.target.value)}
                              placeholder={`${i + 1}.`}
                            />
                          ))}
                        </div>
                      </QuestionBlock>

                      <QuestionBlock label="٤. اذكر ثلاثة من تقنيات الاتصال البيني" error={errors.q4}>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {formData.q4.map((val, i) => (
                            <input 
                              key={i}
                              type="text" 
                              className={`form-input ${errors.q4 ? 'border-red-500' : ''}`}
                              value={val}
                              onChange={e => updateArrayField('q4', i, e.target.value)}
                              placeholder={`${i + 1}.`}
                            />
                          ))}
                        </div>
                      </QuestionBlock>

                      <QuestionBlock label="٥. اذكر اثنتين من أنواع الوسائط الاتصالية" error={errors.q5}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {formData.q5.map((val, i) => (
                            <input 
                              key={i}
                              type="text" 
                              className={`form-input ${errors.q5 ? 'border-red-500' : ''}`}
                              value={val}
                              onChange={e => updateArrayField('q5', i, e.target.value)}
                              placeholder={`${i + 1}.`}
                            />
                          ))}
                        </div>
                      </QuestionBlock>

                      <QuestionBlock label="٦. اذكر ثلاثة من قدرات المنعش أو المسهل" error={errors.q6}>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {formData.q6.map((val, i) => (
                            <input 
                              key={i}
                              type="text" 
                              className={`form-input ${errors.q6 ? 'border-red-500' : ''}`}
                              value={val}
                              onChange={e => updateArrayField('q6', i, e.target.value)}
                              placeholder={`${i + 1}.`}
                            />
                          ))}
                        </div>
                      </QuestionBlock>

                      <QuestionBlock label="٧. اذكر اثنتين من مراحل تغيير السلوك" error={errors.q7}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {formData.q7.map((val, i) => (
                            <input 
                              key={i}
                              type="text" 
                              className={`form-input ${errors.q7 ? 'border-red-500' : ''}`}
                              value={val}
                              onChange={e => updateArrayField('q7', i, e.target.value)}
                              placeholder={`${i + 1}.`}
                            />
                          ))}
                        </div>
                      </QuestionBlock>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer Actions */}
            <div className="bg-slate-50 p-6 flex flex-col md:flex-row items-center justify-between gap-4 border-t border-slate-200">
              <div className="flex items-center space-x-4 space-x-reverse">
                {step > 0 && (
                  <button 
                    type="button"
                    onClick={prevStep}
                    className="flex items-center space-x-2 space-x-reverse px-6 py-3 bg-white border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                    <span>السابق</span>
                  </button>
                )}
                {step < STEPS.length - 1 ? (
                  <button 
                    type="button"
                    onClick={nextStep}
                    className="flex items-center space-x-2 space-x-reverse px-8 py-3 bg-green-700 text-white rounded-xl hover:bg-green-800 transition-all shadow-md"
                  >
                    <span>التالي</span>
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                ) : (
                  <button 
                    type="submit"
                    className="flex items-center space-x-2 space-x-reverse px-10 py-3 bg-green-700 text-white rounded-xl hover:bg-green-800 transition-all shadow-md"
                  >
                    <span>{editingId ? 'تحديث الاستمارة' : 'إرسال الاستمارة'}</span>
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                )}
              </div>
              
              {role === 'admin' && (
                <button 
                  type="button"
                  onClick={downloadXlsForm}
                  className="flex items-center space-x-2 space-x-reverse text-slate-500 hover:text-green-700 transition-colors text-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>تحميل ملف Kobo XLSForm (.xlsx)</span>
                </button>
              )}
            </div>
          </form>
        </div>
          </>
        )}
      </main>

      <footer className="max-w-4xl mx-auto px-4 py-12 text-center text-slate-400 text-sm">
        <p>© {new Date().getFullYear()} وزارة الصحة - الجمهورية الإسلامية الموريتانية</p>
        <p>البرنامج الوطني للتثقيف الصحي</p>
      </footer>

      <style>{`
        .form-input {
          @apply w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all bg-slate-50/50;
        }
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap');
        body {
          font-family: 'Cairo', sans-serif;
        }
      `}</style>
    </div>
  );
}

function FormField({ label, icon: Icon, error, children }: { label: string, icon: any, error?: string, children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-slate-700 flex items-center space-x-2 space-x-reverse">
        <Icon className="w-4 h-4 text-green-600" />
        <span>{label}</span>
      </label>
      {children}
      {error && (
        <div className="flex items-center space-x-1 space-x-reverse text-red-500 text-xs mt-1">
          <AlertCircle className="w-3 h-3" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

function QuestionBlock({ label, error, children }: { label: string, error?: string, children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h6 className="text-md font-bold text-slate-800 border-r-4 border-green-600 pr-3 flex items-center justify-between">
        <span>{label}</span>
        {error && <AlertCircle className="w-4 h-4 text-red-500" />}
      </h6>
      {children}
      {error && <p className="text-red-500 text-xs">{error}</p>}
    </div>
  );
}
