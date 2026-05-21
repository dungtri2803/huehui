import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Users,
  Calendar,
  DollarSign,
  CheckCircle2,
  XCircle,
  Clock,
  Upload,
  Eye,
  Database,
  Edit3,
  Trash2,
  RefreshCw,
  Info,
  AlertCircle,
  Search,
  Plus,
  Save,
  X,
  Lock,
  Unlock,
  UserPlus,
  Crown,
  Sparkles,
  FileText,
  Check,
  Trash
} from 'lucide-react';
import { dbService, Player, Payment, SUPABASE_SQL_SCRIPT } from './services/supabaseService';

export default function App() {
  // App general state
  const [players, setPlayers] = useState<Player[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [currentMonth, setCurrentMonth] = useState<number>(1);
  const [selectedTab, setSelectedTab] = useState<string>('month-details');
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    const expiry = localStorage.getItem('admin_session_expiry');
    if (expiry) {
      const parsedExpiry = parseInt(expiry, 10);
      if (!isNaN(parsedExpiry) && Date.now() < parsedExpiry) {
        return true;
      } else {
        localStorage.removeItem('admin_session_expiry');
      }
    }
    return false;
  });

  // Connection settings state
  const [dbMode, setDbMode] = useState<'supabase' | 'mock'>('supabase');
  const [dbConfig, setDbConfig] = useState({ url: '', key: '' });
  const [testStatus, setTestStatus] = useState<{ type: 'idle' | 'success' | 'error' | 'loading'; message: string }>({ type: 'idle', message: '' });

  // Admin login
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [adminPinError, setAdminPinError] = useState('');

  // UI controls / loadings
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeNotification, setActiveNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Forms & Modals
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [showEditPlayerModal, setShowEditPlayerModal] = useState<Player | null>(null);
  const [showUploadProofModal, setShowUploadProofModal] = useState<{ player: Player; month: number } | null>(null);
  const [showProofViewerModal, setShowProofViewerModal] = useState<{ player: Player; payment: Payment } | null>(null);
  const [showHotHuiModal, setShowHotHuiModal] = useState<{ month: number } | null>(null);

  // Input fields state
  const [playerNameInput, setPlayerNameInput] = useState('');
  const [playerPhoneInput, setPlayerPhoneInput] = useState('');
  const [editPlayerNameInput, setEditPlayerNameInput] = useState('');
  const [editPlayerPhoneInput, setEditPlayerPhoneInput] = useState('');

  // Proof submission fields
  const [submitProofPlayerId, setSubmitProofPlayerId] = useState('');
  const [submitProofMonth, setSubmitProofMonth] = useState(1);
  const [proofType, setProofType] = useState<'file' | 'url'>('file');
  const [proofUrlInput, setProofUrlInput] = useState('');
  const [proofBase64, setProofBase64] = useState<string | null>(null);
  const [proofNotes, setProofNotes] = useState('');
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);

  // Hot Hui Assignment fields
  const [hotHuiPlayerId, setHotHuiPlayerId] = useState('');
  const [bidAmountInput, setBidAmountInput] = useState('0');
  const [hotHuiNotes, setHotHuiNotes] = useState('');

  // References
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputModalRef = useRef<HTMLInputElement>(null);

  // Cycle settings: length matches player count
  const cycleMonths = useMemo(() => {
    return players.length > 0 ? players.length : 1;
  }, [players]);

  // Format VND currency
  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // Load database configurations & initial data
  const loadAllData = async () => {
    setIsLoading(true);
    try {
      dbService.loadConfig();
      const creds = dbService.getCredentials();
      setDbConfig({ url: creds.url, key: creds.key });
      setDbMode(creds.mode);

      const fetchedPlayers = await dbService.getPlayers();
      setPlayers(fetchedPlayers);

      const fetchedPayments = await dbService.getPayments();
      setPayments(fetchedPayments);
    } catch (error: any) {
      showToast('error', 'Lỗi khi tải dữ liệu: ' + (error?.message || error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Tự động đăng xuất admin sau 1 tiếng
  useEffect(() => {
    if (isAdmin) {
      const expiry = localStorage.getItem('admin_session_expiry');
      if (expiry) {
        const parsedExpiry = parseInt(expiry, 10);
        const remainingTime = parsedExpiry - Date.now();
        if (remainingTime > 0) {
          const timer = setTimeout(() => {
            setIsAdmin(false);
            localStorage.removeItem('admin_session_expiry');
            showToast('info', 'Phiên làm việc Admin đã hết hạn (1 tiếng).');
          }, remainingTime);
          return () => clearTimeout(timer);
        } else {
          setIsAdmin(false);
          localStorage.removeItem('admin_session_expiry');
        }
      } else {
        // Dự phòng nếu có trạng thái admin mà chưa lưu thời gian hết hạn
        const expiryTime = Date.now() + 3600000;
        localStorage.setItem('admin_session_expiry', expiryTime.toString());
      }
    }
  }, [isAdmin]);

  // Watch for month adjustment if cycle length shrinks below currentMonth
  useEffect(() => {
    if (currentMonth > cycleMonths && cycleMonths > 0) {
      setCurrentMonth(cycleMonths);
    }
  }, [cycleMonths, currentMonth]);

  // Show transient notification
  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setActiveNotification({ type, message });
    setTimeout(() => {
      setActiveNotification(null);
    }, 4000);
  };

  // Admin Login Handler
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPin === '280320' || adminPin.toLowerCase() === 'admin' || adminPin === '') {
      const expiryTime = Date.now() + 3600000; // 1 tiếng
      localStorage.setItem('admin_session_expiry', expiryTime.toString());
      setIsAdmin(true);
      setShowAdminLogin(false);
      setAdminPin('');
      setAdminPinError('');
      showToast('success', 'Đăng nhập Admin thành công!');
    } else {
      setAdminPinError('Mã PIN không chính xác (Gợi ý: 123456 hoặc để trống)');
    }
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('admin_session_expiry');
    setIsAdmin(false);
    showToast('info', 'Đã đăng xuất quyền Admin');
  };

  // Supabase connection test and save
  const handleSaveDbConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestStatus({ type: 'loading', message: 'Đang kết nối thử tới Supabase...' });

    const success = dbService.setCredentials(dbConfig.url, dbConfig.key, true);

    if (success) {
      const result = await dbService.testConnection();
      if (result.success) {
        setTestStatus({ type: 'success', message: result.message });
        setDbMode('supabase');
        showToast('success', 'Đã lưu cấu hình và kết nối thành công với Supabase!');
        loadAllData();
      } else {
        setTestStatus({ type: 'error', message: result.message });
        showToast('error', 'Kết nối Supabase thất bại. Vui lòng kiểm tra lại cấu hình.');
      }
    } else {
      setTestStatus({ type: 'error', message: 'Định dạng URL hoặc Key không hợp lệ.' });
      showToast('error', 'Lưu cấu hình thất bại.');
    }
  };

  // CRUD Player Operations
  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerNameInput.trim() || !playerPhoneInput.trim()) {
      showToast('error', 'Vui lòng nhập đầy đủ thông tin');
      return;
    }
    setIsLoading(true);
    try {
      const newP = await dbService.addPlayer(playerNameInput.trim(), playerPhoneInput.trim());
      setPlayers(prev => [...prev, newP]);
      setShowAddPlayerModal(false);
      setPlayerNameInput('');
      setPlayerPhoneInput('');
      showToast('success', `Đã thêm thành viên ${newP.name} thành công!`);
      // Refresh all because cycle length changes
      await loadAllData();
    } catch (e: any) {
      showToast('error', 'Lỗi khi thêm thành viên: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditPlayerModal) return;
    if (!editPlayerNameInput.trim() || !editPlayerPhoneInput.trim()) {
      showToast('error', 'Vui lòng nhập đầy đủ thông tin');
      return;
    }
    setIsLoading(true);
    try {
      const updated = await dbService.updatePlayer(
        showEditPlayerModal.id,
        editPlayerNameInput.trim(),
        editPlayerPhoneInput.trim()
      );
      setPlayers(prev => prev.map(p => p.id === updated.id ? updated : p));
      setShowEditPlayerModal(null);
      showToast('success', `Đã cập nhật thông tin ${updated.name}`);
    } catch (e: any) {
      showToast('error', 'Lỗi khi cập nhật: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePlayer = async (id: string) => {
    const player = players.find(p => p.id === id);
    if (!player) return;
    if (!confirm(`Bạn có chắc chắn muốn xóa thành viên "${player.name}"?\nHành động này sẽ xóa tất cả thông tin thanh toán liên quan và thu ngắn chu kỳ hụi!`)) {
      return;
    }
    setIsLoading(true);
    try {
      await dbService.deletePlayer(id);
      setPlayers(prev => prev.filter(p => p.id !== id));
      setPayments(prev => prev.filter(pay => pay.player_id !== id));
      showToast('success', `Đã xóa thành viên ${player.name}`);
      await loadAllData();
    } catch (e: any) {
      showToast('error', 'Lỗi khi xóa: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Payment status and proof toggling by Admin
  const handleTogglePaid = async (playerId: string, month: number) => {
    if (!isAdmin) {
      showToast('error', 'Bạn cần quyền Admin để thực hiện thao tác này');
      return;
    }
    const existing = payments.find(p => p.player_id === playerId && p.month_number === month);
    const currentPaid = existing ? existing.paid : false;

    try {
      const updated = await dbService.updatePaymentStatus(playerId, month, {
        paid: !currentPaid,
        proof_status: !currentPaid ? 'approved' : 'none' // auto approve if checked by admin
      });

      setPayments(prev => {
        const idx = prev.findIndex(p => p.player_id === playerId && p.month_number === month);
        if (idx !== -1) {
          const copy = [...prev];
          copy[idx] = updated;
          return copy;
        } else {
          return [...prev, updated];
        }
      });

      showToast('success', `Đã cập nhật trạng thái đóng tiền cho thành viên`);
    } catch (e: any) {
      showToast('error', 'Lỗi khi lưu trạng thái: ' + e.message);
    }
  };

  // File upload handler for Base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2.5 * 1024 * 1024) {
      alert('Kích thước ảnh quá lớn (yêu cầu < 2.5MB). Vui lòng giảm chất lượng ảnh hoặc chọn ảnh khác.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setProofBase64(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Submit payment proof (by players/normal users)
  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitProofPlayerId) {
      showToast('error', 'Vui lòng chọn thành viên đóng tiền');
      return;
    }

    let finalProofUrl = '';
    if (proofType === 'file') {
      if (!proofBase64) {
        showToast('error', 'Vui lòng chọn tệp hình ảnh hóa đơn/bằng chứng');
        return;
      }
      finalProofUrl = proofBase64;
    } else {
      if (!proofUrlInput.trim()) {
        showToast('error', 'Vui lòng điền link ảnh bằng chứng');
        return;
      }
      finalProofUrl = proofUrlInput.trim();
    }

    setIsSubmittingProof(true);
    try {
      const updated = await dbService.updatePaymentStatus(submitProofPlayerId, submitProofMonth, {
        proof_url: finalProofUrl,
        proof_status: 'pending', // waiting for admin approval
        paid: false, // remain unpaid until admin approves
        notes: proofNotes.trim(),
        submitted_at: new Date().toISOString()
      });

      setPayments(prev => {
        const idx = prev.findIndex(p => p.player_id === submitProofPlayerId && p.month_number === submitProofMonth);
        if (idx !== -1) {
          const copy = [...prev];
          copy[idx] = updated;
          return copy;
        } else {
          return [...prev, updated];
        }
      });

      showToast('success', 'Gửi bằng chứng đóng tiền thành công! Vui lòng chờ Admin phê duyệt.');
      // Reset form
      setProofBase64(null);
      setProofUrlInput('');
      setProofNotes('');
      if (fileInputRef.current) fileInputRef.current.value = '';

      // Direct them to the month details to see the pending badge
      setCurrentMonth(submitProofMonth);
      setSelectedTab('month-details');
    } catch (e: any) {
      showToast('error', 'Lỗi khi gửi bằng chứng: ' + e.message);
    } finally {
      setIsSubmittingProof(false);
    }
  };

  // Admin submits proof directly for a player
  const handleAdminSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showUploadProofModal) return;

    let finalProofUrl = '';
    if (proofType === 'file') {
      if (!proofBase64) {
        showToast('error', 'Vui lòng chọn tệp ảnh');
        return;
      }
      finalProofUrl = proofBase64;
    } else {
      if (!proofUrlInput.trim()) {
        showToast('error', 'Vui lòng dán link ảnh');
        return;
      }
      finalProofUrl = proofUrlInput.trim();
    }

    setIsLoading(true);
    try {
      const updated = await dbService.updatePaymentStatus(
        showUploadProofModal.player.id,
        showUploadProofModal.month,
        {
          proof_url: finalProofUrl,
          proof_status: 'approved', // Auto approved by admin
          paid: true,
          notes: 'Admin đăng bằng chứng trực tiếp',
          submitted_at: new Date().toISOString()
        }
      );

      setPayments(prev => {
        const idx = prev.findIndex(p => p.player_id === showUploadProofModal.player.id && p.month_number === showUploadProofModal.month);
        if (idx !== -1) {
          const copy = [...prev];
          copy[idx] = updated;
          return copy;
        } else {
          return [...prev, updated];
        }
      });

      showToast('success', `Đã thêm bằng chứng và phê duyệt thanh toán cho ${showUploadProofModal.player.name}`);
      setShowUploadProofModal(null);
      setProofBase64(null);
      setProofUrlInput('');
    } catch (e: any) {
      showToast('error', 'Lỗi khi upload bằng chứng: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Admin approves / rejects a payment proof
  const handleApproveProof = async (playerId: string, month: number, approve: boolean) => {
    if (!isAdmin) return;
    setIsLoading(true);
    try {
      const updated = await dbService.updatePaymentStatus(playerId, month, {
        paid: approve,
        proof_status: approve ? 'approved' : 'none',
        notes: approve ? 'Đã duyệt hóa đơn thanh toán' : 'Bằng chứng bị từ chối bởi Admin'
      });

      setPayments(prev => {
        const idx = prev.findIndex(p => p.player_id === playerId && p.month_number === month);
        if (idx !== -1) {
          const copy = [...prev];
          copy[idx] = updated;
          return copy;
        } else {
          return [...prev, updated];
        }
      });

      showToast('success', approve ? 'Đã phê duyệt thanh toán thành công!' : 'Đã từ chối bằng chứng thanh toán');
      setShowProofViewerModal(null);
    } catch (e: any) {
      showToast('error', 'Lỗi khi phê duyệt: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Admin sets Hot Hui player for the month
  const handleSetHotHui = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showHotHuiModal) return;
    const month = showHotHuiModal.month;

    if (!hotHuiPlayerId) {
      showToast('error', 'Vui lòng chọn người hốt hụi');
      return;
    }

    setIsLoading(true);
    try {
      // 1. Clear previous hot hui for this month if any
      const otherPlayers = players.filter(p => p.id !== hotHuiPlayerId);
      for (const p of otherPlayers) {
        const existing = payments.find(pay => pay.player_id === p.id && pay.month_number === month);
        if (existing?.is_hot_hui) {
          await dbService.updatePaymentStatus(p.id, month, {
            is_hot_hui: false,
            bid_amount: 0
          });
        }
      }

      // 2. Set this player as hot hui
      const parsedBid = parseFloat(bidAmountInput) || 0;
      await dbService.updatePaymentStatus(hotHuiPlayerId, month, {
        is_hot_hui: true,
        bid_amount: parsedBid,
        notes: hotHuiNotes.trim() || 'Đã hốt hụi',
        paid: true, // The person who gets the hoot hui naturally satisfies their payment
        proof_status: 'approved'
      });

      // Reload payments from service to ensure local state is perfectly in sync
      const allPayments = await dbService.getPayments();
      setPayments(allPayments);

      showToast('success', `Đã chỉ định người hốt hụi Tháng ${month}`);
      setShowHotHuiModal(null);
      setHotHuiPlayerId('');
      setBidAmountInput('0');
      setHotHuiNotes('');
    } catch (e: any) {
      showToast('error', 'Lỗi khi chỉ định hốt hụi: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Admin removes Hot Hui for the month
  const handleRemoveHotHui = async (playerId: string, month: number) => {
    if (!confirm('Bạn có chắc chắn muốn hủy trạng thái hốt hụi của thành viên này trong tháng này?')) return;
    setIsLoading(true);
    try {
      const updated = await dbService.updatePaymentStatus(playerId, month, {
        is_hot_hui: false,
        bid_amount: 0
      });

      setPayments(prev => {
        const idx = prev.findIndex(p => p.player_id === playerId && p.month_number === month);
        if (idx !== -1) {
          const copy = [...prev];
          copy[idx] = updated;
          return copy;
        }
        return prev;
      });

      showToast('success', 'Đã hủy trạng thái hốt hụi');
    } catch (e: any) {
      showToast('error', 'Lỗi khi hủy hốt hụi: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Calculated Metrics ---

  // List of payments for the selected month
  const currentMonthPayments = useMemo(() => {
    return payments.filter(p => p.month_number === currentMonth);
  }, [payments, currentMonth]);

  // Find who is the hot hui recipient for the current month
  const currentMonthHotHui = useMemo(() => {
    return currentMonthPayments.find(p => p.is_hot_hui);
  }, [currentMonthPayments]);

  const currentHotHuiPlayer = useMemo(() => {
    if (!currentMonthHotHui) return null;
    return players.find(p => p.id === currentMonthHotHui.player_id) || null;
  }, [currentMonthHotHui, players]);

  // Count who has already got hui in PREVIOUS months (1 to currentMonth - 1)
  const deadHuiPlayerIds = useMemo(() => {
    const deadIds = new Set<string>();
    payments.forEach(p => {
      if (p.month_number < currentMonth && p.is_hot_hui) {
        deadIds.add(p.player_id);
      }
    });
    return deadIds;
  }, [payments, currentMonth]);

  // Count pending proofs overall
  const pendingProofsCount = useMemo(() => {
    return payments.filter(p => p.proof_status === 'pending').length;
  }, [payments]);

  // Count pending proofs in current month
  const currentMonthPendingCount = useMemo(() => {
    return currentMonthPayments.filter(p => p.proof_status === 'pending').length;
  }, [currentMonthPayments]);

  // Payment statistics for the selected month
  const paymentStats = useMemo(() => {
    const total = players.length;
    if (total === 0) return { paidCount: 0, unpaidCount: 0, percent: 0 };

    const paidCount = currentMonthPayments.filter(p => p.paid).length;
    return {
      paidCount,
      unpaidCount: total - paidCount,
      percent: Math.round((paidCount / total) * 100)
    };
  }, [players, currentMonthPayments]);

  // Search filtered players
  const filteredPlayers = useMemo(() => {
    if (!searchQuery.trim()) return players;
    const q = searchQuery.toLowerCase().trim();
    return players.filter(
      p => p.name.toLowerCase().includes(q) || p.phone.includes(q)
    );
  }, [players, searchQuery]);

  // Helper: Calculate how much a specific player contributes in the CURRENT month
  // Rules:
  // - Base contribution: 3,000,000 VNĐ
  // - If player is a "Hụi chết" (has already got hụi in previous months), they pay the full 3,000,000 VNĐ.
  // - If player is a "Hụi sống" (has NOT got hụi yet), they get a discount equal to this month's bid amount.
  //   They pay: 3,000,000 - bid_amount.
  // - (Note: The person hốt hụi this month is considered "Hụi sống" for the calculation of what others pay,
  //   but they are the one receiving the entire pot, and their own payment depends on custom, usually
  //   they pay their bidded amount or it cancels out. We calculate the contribution they receive from everyone else.)
  const getPlayerContribution = (playerId: string) => {
    const base = 3000000;
    const bid = currentMonthHotHui?.bid_amount || 0;

    // If player got hui in a previous month, they are Hụi Chết -> pay 100%
    if (deadHuiPlayerIds.has(playerId)) {
      return { amount: base, type: 'chết' as const };
    }
    // Otherwise they are Hụi Sống -> pay base - bid
    return { amount: Math.max(0, base - bid), type: 'sống' as const };
  };

  // Calculation of the total pot received by the current month's hot hui player
  const totalPotCalculation = useMemo(() => {
    if (!currentMonthHotHui || players.length <= 1) return { total: 0, deadCount: 0, liveCount: 0, deadSum: 0, liveSum: 0 };

    const recipientId = currentMonthHotHui.player_id;
    const bid = currentMonthHotHui.bid_amount || 0;
    const base = 3000000;

    let deadCount = 0;
    let liveCount = 0; // excluding the recipient
    let deadSum = 0;
    let liveSum = 0;

    players.forEach(p => {
      if (p.id === recipientId) return; // Recipient receives from others

      if (deadHuiPlayerIds.has(p.id)) {
        deadCount++;
        deadSum += base;
      } else {
        liveCount++;
        liveSum += (base - bid);
      }
    });

    return {
      total: deadSum + liveSum,
      deadCount,
      liveCount,
      deadSum,
      liveSum
    };
  }, [currentMonthHotHui, players, deadHuiPlayerIds]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased pb-16">

      {/* TOAST NOTIFICATION */}
      {activeNotification && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border animate-bounce transition-all duration-300 ${activeNotification.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
            activeNotification.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' :
              'bg-blue-50 border-blue-200 text-blue-800'
          }`}>
          {activeNotification.type === 'success' ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> :
            activeNotification.type === 'error' ? <XCircle className="h-5 w-5 text-rose-500" /> :
              <Info className="h-5 w-5 text-blue-500" />}
          <span className="font-medium text-sm">{activeNotification.message}</span>
        </div>
      )}

      {/* HEADER HERO */}
      <header className="bg-gradient-to-r from-violet-700 via-indigo-800 to-blue-900 text-white shadow-md relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[150%] bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-[-20%] right-[-5%] w-[30%] h-[120%] bg-white/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            {/* Brand Title */}
            <div className="flex items-center gap-3">
              <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md border border-white/20 shadow-inner">
                <Sparkles className="h-8 w-8 text-amber-300 animate-pulse" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
                  Hệ Thống Quản Lý Hụi <span className="bg-amber-400 text-violet-950 text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">V1.2</span>
                </h1>
                <p className="text-violet-200 text-xs sm:text-sm mt-1">
                  Giải pháp quản lý dây Hụi (Huê) thông minh, đồng bộ Supabase thời gian thực
                </p>
              </div>
            </div>

            {/* Controls & Access Role */}
            <div className="flex flex-wrap items-center gap-3">

              {/* DB Status Badge */}
              <button
                onClick={() => setSelectedTab('supabase-config')}
                className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl border backdrop-blur-sm transition-all duration-200 shadow-sm ${dbMode === 'supabase'
                    ? 'bg-emerald-500/10 border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/20'
                    : 'bg-amber-500/10 border-amber-400/30 text-amber-300 hover:bg-amber-500/20'
                  }`}
              >
                <Database className={`h-3.5 w-3.5 ${dbMode === 'supabase' ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`} />
                <span>
                  {dbMode === 'supabase' ? 'Real Supabase' : 'Database Mô Phỏng'}
                </span>
              </button>

              {/* User/Admin Role Toggle */}
              <div className="bg-violet-950/50 p-1 rounded-xl border border-violet-500/30 flex items-center">
                <button
                  onClick={() => {
                    if (isAdmin) handleAdminLogout();
                    else setSelectedTab('month-details');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${!isAdmin ? 'bg-white text-violet-950 shadow-sm' : 'text-violet-200 hover:text-white'
                    }`}
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>Người xem</span>
                </button>

                <button
                  onClick={() => {
                    if (!isAdmin) {
                      setShowAdminLogin(true);
                    } else {
                      handleAdminLogout();
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${isAdmin ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-violet-950 shadow-md font-bold' : 'text-violet-200 hover:text-white'
                    }`}
                >
                  {isAdmin ? <Unlock className="h-3.5 w-3.5 text-violet-900" /> : <Lock className="h-3.5 w-3.5" />}
                  <span>Admin</span>
                </button>
              </div>

              {/* Refresh Button */}
              <button
                onClick={loadAllData}
                disabled={isLoading}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all shadow-sm disabled:opacity-50"
                title="Tải lại dữ liệu"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">

        {/* TOP STATISTICS DASHBOARD */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">

          {/* Stat 1: Total Players */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-all flex items-center justify-between relative overflow-hidden group">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tổng thành viên</p>
              <h3 className="text-2xl font-bold text-slate-800">{players.length} người chơi</h3>
              <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                <Info className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                Tính toán chu kỳ dựa trên thành viên
              </p>
            </div>
            <div className="bg-violet-50 p-3.5 rounded-2xl group-hover:bg-violet-100 transition-all text-violet-600">
              <Users className="h-6 w-6" />
            </div>
          </div>

          {/* Stat 2: Auto Cycle Length */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-all flex items-center justify-between relative overflow-hidden group">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Chu kỳ hụi</p>
              <h3 className="text-2xl font-bold text-slate-800">{cycleMonths} Tháng</h3>
              <div className="text-xs text-violet-600 font-semibold mt-2 bg-violet-50 inline-block px-2 py-0.5 rounded-md">
                {formatVND(3000000)} / người / tháng
              </div>
            </div>
            <div className="bg-indigo-50 p-3.5 rounded-2xl group-hover:bg-indigo-100 transition-all text-indigo-600">
              <Calendar className="h-6 w-6" />
            </div>
          </div>

          {/* Stat 3: Total Monthly Fund */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-all flex items-center justify-between relative overflow-hidden group">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tổng quỹ hụi / Tháng</p>
              <h3 className="text-2xl font-bold text-emerald-600">{formatVND(players.length * 3000000)}</h3>
              <p className="text-xs text-slate-500 mt-2">
                {players.length} người × 3.000.000đ
              </p>
            </div>
            <div className="bg-emerald-50 p-3.5 rounded-2xl group-hover:bg-emerald-100 transition-all text-emerald-600">
              <DollarSign className="h-6 w-6" />
            </div>
          </div>

          {/* Stat 4: Monthly Payments Progress */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-all flex flex-col justify-between group">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Đóng tiền Tháng {currentMonth}</p>
                <h3 className="text-xl font-bold text-slate-800">
                  {paymentStats.paidCount} / {players.length} đã đóng
                </h3>
              </div>
              <div className="bg-sky-50 p-2.5 rounded-xl text-sky-600">
                <Clock className="h-5 w-5" />
              </div>
            </div>

            <div className="w-full bg-slate-100 rounded-full h-2 mt-2">
              <div
                className="bg-gradient-to-r from-indigo-500 to-sky-400 h-2 rounded-full transition-all duration-500"
                style={{ width: `${paymentStats.percent}%` }}
              ></div>
            </div>
            <div className="flex items-center justify-between mt-1.5 text-[11px] text-slate-500 font-medium">
              <span>Tiến độ: {paymentStats.percent}%</span>
              {currentMonthPendingCount > 0 && (
                <span className="text-amber-600 font-bold animate-pulse">
                  ({currentMonthPendingCount} chờ duyệt)
                </span>
              )}
            </div>
          </div>

        </section>

        {/* MAIN NAVIGATION TABS */}
        <div className="flex flex-wrap border-b border-slate-200 mb-6 gap-2">
          <button
            onClick={() => setSelectedTab('month-details')}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${selectedTab === 'month-details'
                ? 'border-violet-600 text-violet-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
          >
            <Calendar className="h-4 w-4" />
            <span>Bảng Theo Dõi Tháng</span>
          </button>

          <button
            onClick={() => setSelectedTab('players')}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${selectedTab === 'players'
                ? 'border-violet-600 text-violet-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
          >
            <Users className="h-4 w-4" />
            <span>Quản Lý Thành Viên</span>
            <span className="bg-slate-200 text-slate-700 text-xs rounded-full px-2 py-0.5">
              {players.length}
            </span>
          </button>

          <button
            onClick={() => setSelectedTab('submit-proof')}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${selectedTab === 'submit-proof'
                ? 'border-violet-600 text-violet-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
          >
            <Upload className="h-4 w-4" />
            <span>Gửi Bằng Chứng Đóng Tiền</span>
          </button>

          <button
            onClick={() => setSelectedTab('pending-approvals')}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 relative ${selectedTab === 'pending-approvals'
                ? 'border-violet-600 text-violet-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>Phê Duyệt Bằng Chứng</span>
            {pendingProofsCount > 0 && (
              <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                {pendingProofsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setSelectedTab('supabase-config')}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${selectedTab === 'supabase-config'
                ? 'border-violet-600 text-violet-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
          >
            <Database className="h-4 w-4" />
            <span>Cấu Hình Supabase</span>
          </button>
        </div>

        {/* TAB CONTENT */}
        <div className="space-y-6">

          {/* TAB 1: MONTH DETAILS & MAIN TRACKING GRID */}
          {selectedTab === 'month-details' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Left & Center Column: Month controller & Table */}
              <div className="lg:col-span-2 space-y-6">

                {/* Month Selector card */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-slate-800 text-base sm:text-lg">Lựa chọn tháng chu kỳ</h4>
                      <p className="text-xs text-slate-400 mt-0.5">Theo dõi trạng thái đóng tiền & hốt hụi</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Tháng xem:</label>
                      <select
                        value={currentMonth}
                        onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
                        className="bg-slate-50 border border-slate-200 text-slate-800 font-bold text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                      >
                        {Array.from({ length: cycleMonths }, (_, i) => i + 1).map((m) => (
                          <option key={m} value={m}>Tháng {m} / {cycleMonths}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Horizontal quick month slider */}
                  <div className="flex gap-2 overflow-x-auto py-3 mt-4 scrollbar-thin scrollbar-thumb-slate-200">
                    {Array.from({ length: cycleMonths }, (_, i) => i + 1).map((m) => (
                      <button
                        key={m}
                        onClick={() => setCurrentMonth(m)}
                        className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${currentMonth === m
                            ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                      >
                        Tháng {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Player Payment status table */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
                    <div>
                      <h3 className="font-extrabold text-slate-800 text-base">
                        Danh Sách Đóng Hụi - Tháng {currentMonth}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Được tự động tính theo danh sách {players.length} thành viên
                      </p>
                    </div>

                    {isAdmin && (
                      <button
                        onClick={() => setShowHotHuiModal({ month: currentMonth })}
                        className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm hover:shadow flex items-center gap-1.5 transition-all"
                      >
                        <Crown className="h-3.5 w-3.5 text-amber-100" />
                        <span>Gán Hốt Hụi Tháng {currentMonth}</span>
                      </button>
                    )}
                  </div>

                  {players.length === 0 ? (
                    <div className="p-12 text-center">
                      <div className="inline-flex p-4 bg-slate-50 rounded-full text-slate-400 mb-3">
                        <Users className="h-8 w-8" />
                      </div>
                      <h4 className="font-bold text-slate-700">Chưa có người chơi nào</h4>
                      <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                        Vui lòng chuyển sang tab "Quản Lý Thành Viên" để thêm người chơi vào hệ thống.
                      </p>
                      <button
                        onClick={() => setSelectedTab('players')}
                        className="mt-4 inline-flex items-center gap-1 bg-violet-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-violet-700 transition-all"
                      >
                        <UserPlus className="h-4 w-4" />
                        <span>Thêm thành viên ngay</span>
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            <th className="py-4 px-6">Họ tên & SĐT</th>
                            <th className="py-4 px-6">Vai trò đóng</th>
                            <th className="py-4 px-6 text-right">Số tiền đóng</th>
                            <th className="py-4 px-6">Trạng thái</th>
                            <th className="py-4 px-6">Bằng chứng</th>
                            {isAdmin && <th className="py-4 px-6 text-center">Tác vụ Admin</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                          {players.map((player) => {
                            const payment = currentMonthPayments.find(pay => pay.player_id === player.id);
                            const { amount, type } = getPlayerContribution(player.id);

                            const isRecipient = payment?.is_hot_hui;

                            return (
                              <tr
                                key={player.id}
                                className={`hover:bg-slate-50/50 transition-all ${isRecipient ? 'bg-amber-50/40 hover:bg-amber-50/60' : ''
                                  }`}
                              >
                                <td className="py-4 px-6">
                                  <div className="flex items-center gap-3">
                                    {isRecipient ? (
                                      <div className="h-8 w-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center border border-amber-200 flex-shrink-0" title="Hốt hụi tháng này">
                                        <Crown className="h-4 w-4" />
                                      </div>
                                    ) : (
                                      <div className="h-8 w-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                                        {player.name.charAt(0).toUpperCase()}
                                      </div>
                                    )}
                                    <div>
                                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                        {player.name}
                                        {isRecipient && (
                                          <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-1.5 py-0.2 rounded">HỐT HỤI</span>
                                        )}
                                      </div>
                                      <div className="text-xs text-slate-400 font-medium">{player.phone}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-4 px-6">
                                  {isRecipient ? (
                                    <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                                      Người nhận
                                    </span>
                                  ) : type === 'chết' ? (
                                    <span className="text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full" title="Đã hốt hụi ở tháng trước, đóng đủ 3.000.000 VNĐ">
                                      Hụi chết 💀
                                    </span>
                                  ) : (
                                    <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full" title="Chưa hốt hụi, đóng 3.000.000 VNĐ trừ tiền kêu hụi">
                                      Hụi sống 🌱
                                    </span>
                                  )}
                                </td>
                                <td className="py-4 px-6 text-right font-extrabold text-slate-700">
                                  {isRecipient ? '—' : formatVND(amount)}
                                </td>
                                <td className="py-4 px-6">
                                  {payment?.paid ? (
                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg">
                                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                      <span>Đã đóng</span>
                                    </span>
                                  ) : payment?.proof_status === 'pending' ? (
                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg animate-pulse">
                                      <Clock className="h-3.5 w-3.5 text-amber-500 animate-spin" style={{ animationDuration: '3s' }} />
                                      <span>Chờ duyệt</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-lg">
                                      <XCircle className="h-3.5 w-3.5 text-rose-400" />
                                      <span>Chưa đóng</span>
                                    </span>
                                  )}
                                </td>
                                <td className="py-4 px-6">
                                  {payment?.proof_url ? (
                                    <button
                                      onClick={() => setShowProofViewerModal({ player, payment })}
                                      className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 underline bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100 transition-all"
                                    >
                                      <Eye className="h-3 w-3" />
                                      Xem ảnh
                                    </button>
                                  ) : (
                                    <span className="text-xs text-slate-400 font-medium">Chưa có</span>
                                  )}
                                </td>

                                {isAdmin && (
                                  <td className="py-4 px-6 text-center">
                                    <div className="inline-flex items-center gap-2">

                                      {/* Quick toggle paid status */}
                                      <button
                                        onClick={() => handleTogglePaid(player.id, currentMonth)}
                                        className={`p-1.5 rounded-lg border transition-all ${payment?.paid
                                            ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100'
                                            : 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100'
                                          }`}
                                        title={payment?.paid ? 'Đánh dấu Chưa đóng' : 'Đánh dấu Đã đóng'}
                                      >
                                        {payment?.paid ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                                      </button>

                                      {/* Upload button */}
                                      <button
                                        onClick={() => {
                                          setShowUploadProofModal({ player, month: currentMonth });
                                          setProofType('file');
                                          setProofBase64(null);
                                          setProofUrlInput('');
                                        }}
                                        className="p-1.5 rounded-lg border bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                                        title="Đăng bằng chứng trực tiếp"
                                      >
                                        <Upload className="h-3.5 w-3.5" />
                                      </button>

                                      {/* Remove Hot Hui button if this person is Hot Hui */}
                                      {isRecipient && (
                                        <button
                                          onClick={() => handleRemoveHotHui(player.id, currentMonth)}
                                          className="p-1.5 rounded-lg border bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100"
                                          title="Hủy hốt hụi"
                                        >
                                          <Trash className="h-3.5 w-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Bidding details & Visual traditional calculator */}
              <div className="space-y-6">

                {/* MONTH'S POT INFORMATION (HỐT HỤI CARD) */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 relative overflow-hidden">
                  {currentMonthHotHui && (
                    <div className="absolute top-0 right-0 bg-amber-400 text-amber-950 text-[10px] font-extrabold px-3 py-1 rounded-bl-xl flex items-center gap-1">
                      <Crown className="h-3 w-3" />
                      <span>ĐÃ HỐT HỤI</span>
                    </div>
                  )}

                  <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                    <span>Hốt Hụi Tháng {currentMonth}</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Thông tin chi tiết khoản thu của người chơi</p>

                  {currentMonthHotHui ? (
                    <div className="mt-6 space-y-5">
                      {/* Recipient details */}
                      <div className="flex items-start gap-4 bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
                        <div className="bg-amber-400 text-amber-950 p-2.5 rounded-xl flex-shrink-0 mt-1">
                          <Crown className="h-6 w-6" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-slate-800 text-base">
                            {currentHotHuiPlayer?.name || 'Không tìm thấy'}
                          </h4>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">
                            SĐT: {currentHotHuiPlayer?.phone || '—'}
                          </p>
                          {currentMonthHotHui.notes && (
                            <p className="text-[11px] text-amber-800 italic bg-white/80 border border-amber-100 rounded-lg px-2 py-1 mt-2">
                              Ghi chú: "{currentMonthHotHui.notes}"
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Calculator breakdown */}
                      <div className="space-y-3 border-t border-slate-100 pt-4">
                        <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                          <span>Tiền thăm (kêu hụi):</span>
                          <span className="font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-lg">
                            {formatVND(currentMonthHotHui.bid_amount || 0)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                          <span>Hụi chết ({totalPotCalculation.deadCount} người):</span>
                          <span className="font-bold text-slate-800">
                            + {formatVND(totalPotCalculation.deadSum)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                          <span>Hụi sống ({totalPotCalculation.liveCount} người):</span>
                          <span className="font-bold text-slate-800">
                            + {formatVND(totalPotCalculation.liveSum)}
                          </span>
                        </div>

                        <div className="border-t border-dashed border-slate-200 pt-3 mt-3 flex items-center justify-between">
                          <div>
                            <span className="text-xs font-extrabold text-slate-800">Tổng thực nhận:</span>
                            <p className="text-[10px] text-slate-400">(Đã cấn trừ tiền thăm)</p>
                          </div>
                          <span className="text-lg font-black text-amber-600">
                            {formatVND(totalPotCalculation.total)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-6 text-center py-8 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                      <div className="inline-flex p-3 bg-slate-100 rounded-full text-slate-400 mb-2">
                        <Crown className="h-6 w-6" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-600">Chưa có người hốt hụi</h4>
                      <p className="text-xs text-slate-400 max-w-[200px] mx-auto mt-1">
                        Vui lòng chỉ định người hốt hụi cho tháng này để tự động tính toán dòng tiền.
                      </p>

                      {isAdmin ? (
                        <button
                          onClick={() => setShowHotHuiModal({ month: currentMonth })}
                          className="mt-4 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1 mx-auto"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Chỉ định người hốt</span>
                        </button>
                      ) : (
                        <p className="text-[11px] text-amber-600 italic mt-3">
                          * Đăng nhập Admin để chỉ định người hốt hụi
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* AUTHENTIC VIETNAMESE HỤI RULES / CALCULATOR */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-sm border border-slate-800">
                  <div className="flex items-center gap-2 mb-4">
                    <Info className="h-5 w-5 text-amber-400 flex-shrink-0" />
                    <h3 className="font-bold text-base">Cách Tính Tiền Hụi (Huê)</h3>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed mb-4">
                    Hệ thống áp dụng cách tính <strong>Hụi Thảo Luận / Hụi Thăm</strong> truyền thống:
                  </p>

                  <div className="space-y-3 text-xs">
                    <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                      <p className="font-bold text-amber-400 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 bg-amber-400 rounded-full inline-block"></span>
                        Hụi Chết 💀
                      </p>
                      <p className="text-[11px] text-slate-300 mt-1">
                        Thành viên <strong>đã hốt hụi</strong> ở các tháng trước. Tháng này phải đóng <strong>đủ 100%</strong> (3.000.000đ / tháng).
                      </p>
                    </div>

                    <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                      <p className="font-bold text-emerald-400 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full inline-block"></span>
                        Hụi Sống 🌱
                      </p>
                      <p className="text-[11px] text-slate-300 mt-1">
                        Thành viên <strong>chưa hốt hụi</strong>. Tháng này được <strong>trừ tiền thăm</strong> do người hốt hụi kêu (3.000.000đ - Tiền Thăm).
                      </p>
                    </div>

                    <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                      <p className="font-bold text-sky-400 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 bg-sky-400 rounded-full inline-block"></span>
                        Quỹ Nhận Được 💰
                      </p>
                      <p className="text-[11px] text-slate-300 mt-1">
                        Người hốt hụi tháng này nhận:
                        <span className="block font-mono text-amber-300 bg-black/30 p-1.5 rounded mt-1 text-center">
                          (Hụi chết × 3tr) + (Hụi sống × (3tr - Tiền thăm))
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: PLAYER MANAGEMENT */}
          {selectedTab === 'players' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">

              {/* Search & Add Bar */}
              <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-lg">
                    Danh Sách Thành Viên
                  </h3>
                  <p className="text-xs text-slate-400">
                    Quản lý người chơi tham gia đóng hụi. Chu kỳ hụi tự động thay đổi theo số người tham gia.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Search input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Tìm họ tên hoặc SĐT..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-violet-500 w-60"
                    />
                  </div>

                  {isAdmin && (
                    <button
                      onClick={() => {
                        setPlayerNameInput('');
                        setPlayerPhoneInput('');
                        setShowAddPlayerModal(true);
                      }}
                      className="bg-gradient-to-r from-violet-600 to-indigo-700 hover:from-violet-700 hover:to-indigo-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all"
                    >
                      <UserPlus className="h-4 w-4" />
                      <span>Thêm Thành Viên</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Grid list */}
              {filteredPlayers.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="inline-flex p-4 bg-slate-50 rounded-full text-slate-400 mb-3">
                    <Users className="h-8 w-8" />
                  </div>
                  <h4 className="font-bold text-slate-700">Không tìm thấy kết quả</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Vui lòng thử lại với cụm từ tìm kiếm khác hoặc thêm thành viên mới.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-4 px-6">Tên thành viên</th>
                        <th className="py-4 px-6">Số điện thoại</th>
                        <th className="py-4 px-6">Số tháng đã đóng (Duyệt)</th>
                        <th className="py-4 px-6">Lịch sử hốt hụi</th>
                        {isAdmin && <th className="py-4 px-6 text-center">Hành động</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {filteredPlayers.map((player) => {
                        // Compute months paid
                        const playerPayments = payments.filter(pay => pay.player_id === player.id && pay.paid);
                        // Compute months got hot hui
                        const hotHuiMonths = payments.filter(pay => pay.player_id === player.id && pay.is_hot_hui);

                        return (
                          <tr key={player.id} className="hover:bg-slate-50/50 transition-all">
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center font-bold border border-violet-100">
                                  {player.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="font-extrabold text-slate-800">{player.name}</div>
                              </div>
                            </td>
                            <td className="py-4 px-6 font-mono font-medium text-slate-600">
                              {player.phone}
                            </td>
                            <td className="py-4 px-6">
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
                                {playerPayments.length} / {cycleMonths} tháng
                              </span>
                            </td>
                            <td className="py-4 px-6">
                              {hotHuiMonths.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {hotHuiMonths.map(h => (
                                    <span key={h.month_number} className="inline-flex items-center gap-0.5 text-[10px] font-extrabold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                                      <Crown className="h-3 w-3" />
                                      Tháng {h.month_number} ({formatVND(h.bid_amount || 0)} thăm)
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400 font-medium italic">Chưa hốt hụi</span>
                              )}
                            </td>

                            {isAdmin && (
                              <td className="py-4 px-6 text-center">
                                <div className="inline-flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => {
                                      setEditPlayerNameInput(player.name);
                                      setEditPlayerPhoneInput(player.phone);
                                      setShowEditPlayerModal(player);
                                    }}
                                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-all"
                                    title="Sửa thành viên"
                                  >
                                    <Edit3 className="h-3.5 w-3.5" />
                                  </button>

                                  <button
                                    onClick={() => handleDeletePlayer(player.id)}
                                    className="p-1.5 rounded-lg border border-rose-150 text-rose-600 hover:bg-rose-50 transition-all"
                                    title="Xóa thành viên"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SUBMIT PROOF (FOR PLAYERS) */}
          {selectedTab === 'submit-proof' && (
            <div className="max-w-2xl mx-auto bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100">

              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                <div className="p-2.5 bg-violet-50 text-violet-600 rounded-xl">
                  <Upload className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-lg">
                    Gửi Bằng Chứng Đóng Tiền
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Dành cho người chơi báo cáo đã thanh toán tiền hụi tháng này
                  </p>
                </div>
              </div>

              {players.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl">
                  <AlertCircle className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">
                    Không tìm thấy thành viên nào trên hệ thống. Hãy thêm thành viên trước khi gửi bằng chứng.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmitProof} className="space-y-5">

                  {/* Step 1: Select Player */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                      1. Chọn tên của bạn: <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={submitProofPlayerId}
                      onChange={(e) => setSubmitProofPlayerId(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    >
                      <option value="">-- Chọn thành viên đóng tiền --</option>
                      {players.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.phone})</option>
                      ))}
                    </select>
                  </div>

                  {/* Step 2: Select Month */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                      2. Chọn tháng đóng tiền: <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={submitProofMonth}
                      onChange={(e) => setSubmitProofMonth(parseInt(e.target.value))}
                      required
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    >
                      {Array.from({ length: cycleMonths }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m}>Tháng {m}</option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-400 italic">
                      Số tiền đóng dự kiến sẽ tự động trừ tiền kêu hụi của tháng đó (nếu có).
                    </p>
                  </div>

                  {/* Step 3: Choose Proof Upload type */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                      3. Bằng chứng thanh toán: <span className="text-rose-500">*</span>
                    </label>

                    <div className="flex items-center gap-4 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setProofType('file')}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${proofType === 'file'
                            ? 'bg-white text-violet-700 shadow-sm'
                            : 'text-slate-500 hover:text-slate-800'
                          }`}
                      >
                        Tải lên tệp ảnh
                      </button>
                      <button
                        type="button"
                        onClick={() => setProofType('url')}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${proofType === 'url'
                            ? 'bg-white text-violet-700 shadow-sm'
                            : 'text-slate-500 hover:text-slate-800'
                          }`}
                      >
                        Dán link ảnh (URL)
                      </button>
                    </div>

                    {proofType === 'file' ? (
                      <div className="border-2 border-dashed border-slate-200 rounded-xl p-5 text-center bg-slate-50 hover:bg-slate-100/50 transition-all relative cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />

                        {proofBase64 ? (
                          <div className="space-y-2">
                            <img
                              src={proofBase64}
                              alt="Payment Proof Preview"
                              className="max-h-48 mx-auto rounded-lg shadow border border-slate-200 object-contain"
                            />
                            <p className="text-xs text-emerald-600 font-bold flex items-center justify-center gap-1">
                              <CheckCircle2 className="h-4 w-4" />
                              <span>Đã chọn ảnh thành công</span>
                            </p>
                            <button
                              type="button"
                              onClick={() => setProofBase64(null)}
                              className="text-[10px] text-rose-600 font-semibold underline"
                            >
                              Hủy và chọn lại
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2 py-4">
                            <Upload className="h-8 w-8 text-slate-400 mx-auto" />
                            <p className="text-xs font-bold text-slate-700">Click để chọn ảnh hóa đơn chuyển khoản</p>
                            <p className="text-[10px] text-slate-400">Hỗ trợ ảnh JPG, PNG dưới 2.5MB</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <input
                          type="url"
                          placeholder="https://example.com/receipt-image.jpg"
                          value={proofUrlInput}
                          onChange={(e) => setProofUrlInput(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono"
                        />
                        <p className="text-[10px] text-slate-400">Dán link ảnh công khai từ Unsplash, Imgur, Facebook...</p>
                      </div>
                    )}
                  </div>

                  {/* Step 4: Notes */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                      4. Ghi chú bổ sung (nếu có):
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Ví dụ: Chuyển khoản từ tài khoản Nguyễn Văn A..."
                      value={proofNotes}
                      onChange={(e) => setProofNotes(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    ></textarea>
                  </div>

                  {/* Submit button */}
                  <button
                    type="submit"
                    disabled={isSubmittingProof}
                    className="w-full bg-gradient-to-r from-violet-600 to-indigo-700 hover:from-violet-700 hover:to-indigo-800 text-white py-3.5 rounded-xl font-bold shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {isSubmittingProof ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Đang gửi bằng chứng...</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        <span>Gửi Hóa Đơn Cho Admin Duyệt</span>
                      </>
                    )}
                  </button>

                </form>
              )}

            </div>
          )}

          {/* TAB 4: PENDING APPROVALS (ADMIN ONLY AREA) */}
          {selectedTab === 'pending-approvals' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">

              <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                    <span>Phê Duyệt Bằng Chứng Thanh Toán</span>
                    {pendingProofsCount > 0 && (
                      <span className="bg-amber-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full animate-pulse">
                        {pendingProofsCount} hóa đơn chờ
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Chỉ dành cho Admin duyệt bằng chứng hình ảnh để xác nhận thanh toán của người chơi.
                  </p>
                </div>

                {!isAdmin && (
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-3.5 py-2 rounded-xl">
                    <Lock className="h-4 w-4 text-amber-500 flex-shrink-0" />
                    <span>Vui lòng chuyển sang quyền Admin ở góc phải màn hình để phê duyệt!</span>
                  </div>
                )}
              </div>

              {payments.filter(p => p.proof_status === 'pending').length === 0 ? (
                <div className="p-16 text-center">
                  <div className="inline-flex p-4 bg-slate-50 rounded-full text-emerald-500 mb-3 border border-emerald-100">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h4 className="font-bold text-slate-700">Không có bằng chứng nào chờ phê duyệt</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    Tuyệt vời! Tất cả bằng chứng đã được giải quyết xong.
                  </p>
                </div>
              ) : (
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {payments.filter(p => p.proof_status === 'pending').map((pay) => {
                    const player = players.find(pl => pl.id === pay.player_id);
                    if (!player) return null;

                    const { amount } = getPlayerContribution(player.id);

                    return (
                      <div key={pay.id} className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden flex flex-col shadow-sm hover:shadow transition-all">
                        {/* Header of Card */}
                        <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between">
                          <div>
                            <h4 className="font-extrabold text-slate-800 text-sm">{player.name}</h4>
                            <p className="text-[11px] text-slate-400 mt-0.5">{player.phone}</p>
                          </div>
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded">
                            Tháng {pay.month_number}
                          </span>
                        </div>

                        {/* Image Proof Preview */}
                        <div className="relative h-48 bg-black/10 group overflow-hidden flex items-center justify-center">
                          {pay.proof_url ? (
                            <img
                              src={pay.proof_url}
                              alt="Receipt"
                              className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                            />
                          ) : (
                            <div className="text-slate-400 text-xs">Không tìm thấy ảnh</div>
                          )}
                          <button
                            onClick={() => setShowProofViewerModal({ player, payment: pay })}
                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white font-bold text-xs transition-all gap-1.5"
                          >
                            <Eye className="h-4 w-4" />
                            <span>Phóng to hóa đơn</span>
                          </button>
                        </div>

                        {/* Card Body Info */}
                        <div className="p-4 flex-1 space-y-2 bg-white border-t border-slate-100 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Số tiền cần đóng:</span>
                            <span className="font-extrabold text-slate-800">{formatVND(amount)}</span>
                          </div>
                          {pay.submitted_at && (
                            <div className="flex justify-between">
                              <span className="text-slate-500">Thời gian gửi:</span>
                              <span className="font-medium text-slate-600">
                                {new Date(pay.submitted_at).toLocaleString('vi-VN')}
                              </span>
                            </div>
                          )}
                          {pay.notes && (
                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 mt-1 text-[11px]">
                              <span className="font-bold text-slate-700 block">Lời nhắn:</span>
                              <span className="text-slate-500 italic">"{pay.notes}"</span>
                            </div>
                          )}
                        </div>

                        {/* Card Footer Actions */}
                        {isAdmin ? (
                          <div className="flex border-t border-slate-200">
                            <button
                              onClick={() => handleApproveProof(player.id, pay.month_number, false)}
                              className="flex-1 py-3 text-rose-600 font-extrabold hover:bg-rose-50 transition-all text-xs border-r border-slate-200 flex items-center justify-center gap-1"
                            >
                              <XCircle className="h-4 w-4" />
                              <span>Từ chối</span>
                            </button>
                            <button
                              onClick={() => handleApproveProof(player.id, pay.month_number, true)}
                              className="flex-1 py-3 text-emerald-600 font-extrabold hover:bg-emerald-50 transition-all text-xs flex items-center justify-center gap-1"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              <span>Duyệt đóng</span>
                            </button>
                          </div>
                        ) : (
                          <div className="p-3.5 text-center bg-slate-50 text-slate-400 text-[11px] italic border-t border-slate-150">
                            Đăng nhập Admin để thực hiện duyệt
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}

          {/* TAB 5: SUPABASE CONFIGURATION */}
          {selectedTab === 'supabase-config' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Setup Form */}
              <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100 space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                  <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                    <Database className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-lg">
                      Kết Nối Supabase Database
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Cấu hình kết nối Supabase để lưu trữ dữ liệu thực tế.
                    </p>
                  </div>
                </div>

                {/* Status widget */}
                <div className={`p-4 rounded-2xl border flex items-start gap-3 ${dbMode === 'supabase'
                    ? 'bg-emerald-50 border-emerald-150 text-emerald-800'
                    : 'bg-amber-50 border-amber-150 text-amber-800'
                  }`}>
                  <div className={`p-1.5 rounded-lg ${dbMode === 'supabase' ? 'bg-emerald-200/50' : 'bg-amber-200/50'} flex-shrink-0 mt-0.5`}>
                    <Database className={`h-5 w-5 ${dbMode === 'supabase' ? 'text-emerald-600 animate-pulse' : 'text-amber-600'}`} />
                  </div>
                  <div className="text-xs space-y-1">
                    <p className="font-extrabold">
                      Trạng thái hiện tại: {dbMode === 'supabase' ? 'Kết nối Supabase thực tế (Real DB)' : 'Đang chạy mô phỏng offline'}
                    </p>
                    <p className="text-slate-500 leading-relaxed">
                      {dbMode === 'supabase'
                        ? 'Mọi thông tin thêm, sửa, xóa thành viên, đánh dấu trạng thái đóng tiền hoặc hình ảnh đều được đồng bộ trực tiếp từ tài khoản Supabase của bạn.'
                        : 'Hệ thống đang lưu trữ thông tin tạm thời trên bộ nhớ trình duyệt. Mọi thay đổi sẽ mất khi bạn tải lại trang. Vui lòng điền thông tin kết nối Supabase để lưu dữ liệu lâu dài.'}
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSaveDbConfig} className="space-y-5 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Supabase URL:
                    </label>
                    <input
                      type="url"
                      placeholder="https://xxxxxxxxxxxxxxxxxxxx.supabase.co"
                      value={dbConfig.url}
                      onChange={(e) => setDbConfig(prev => ({ ...prev, url: e.target.value }))}
                      required
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Supabase Anon Key (Public API Key):
                    </label>
                    <input
                      type="text"
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIs..."
                      value={dbConfig.key}
                      onChange={(e) => setDbConfig(prev => ({ ...prev, key: e.target.value }))}
                      required
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono"
                    />
                  </div>

                  {testStatus.type !== 'idle' && (
                    <div className={`p-3.5 rounded-xl text-xs font-medium border flex items-start gap-2 ${testStatus.type === 'loading' ? 'bg-blue-50 border-blue-100 text-blue-800' :
                        testStatus.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' :
                          'bg-rose-50 border-rose-150 text-rose-800'
                      }`}>
                      {testStatus.type === 'loading' && <RefreshCw className="h-4 w-4 text-blue-500 animate-spin flex-shrink-0 mt-0.5" />}
                      {testStatus.type === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />}
                      {testStatus.type === 'error' && <AlertCircle className="h-4 w-4 text-rose-500 flex-shrink-0 mt-0.5" />}
                      <p className="leading-normal">{testStatus.message}</p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      type="submit"
                      className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white py-3.5 rounded-xl font-bold text-xs shadow-md hover:shadow flex items-center justify-center gap-2 transition-all"
                    >
                      <Save className="h-4 w-4" />
                      <span>Lưu & Kết Nối Supabase</span>
                    </button>
                  </div>

                </form>
              </div>

              {/* Setup Instructions */}
              <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100 space-y-5">
                <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2 border-b border-slate-100 pb-4">
                  <Sparkles className="h-5 w-5 text-amber-500" />
                  <span>Hướng dẫn cài đặt cơ sở dữ liệu</span>
                </h3>

                <div className="text-xs text-slate-600 space-y-4 leading-relaxed">
                  <p>Để hệ thống hoạt động trơn tru trên Supabase của riêng bạn, vui lòng thực hiện các bước sau:</p>

                  <ol className="list-decimal pl-5 space-y-2">
                    <li>
                      Truy cập <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-indigo-600 font-bold hover:underline">Supabase (supabase.com)</a> và tạo một project mới (Miễn phí).
                    </li>
                    <li>
                      Vào mục <strong>SQL Editor</strong> trong bảng điều khiển của Supabase.
                    </li>
                    <li>
                      Bấm <strong>New query</strong>, sao chép toàn bộ mã lệnh SQL phía dưới và bấm <strong>Run</strong> để khởi tạo các bảng.
                    </li>
                    <li>
                      Lấy <strong>Project URL</strong> và <strong>API Key (Anon key)</strong> trong phần <strong>Project Settings &gt; API</strong>, sau đó dán vào khung bên trái của bạn để kết nối!
                    </li>
                  </ol>

                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">Mã SQL Khởi Tạo Cơ Sở Dữ Liệu:</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(SUPABASE_SQL_SCRIPT);
                          showToast('success', 'Đã sao chép mã SQL vào clipboard!');
                        }}
                        className="text-[10px] bg-violet-50 text-violet-700 font-bold px-2.5 py-1.5 rounded-lg border border-violet-100 hover:bg-violet-100 transition-all"
                      >
                        Sao chép mã SQL
                      </button>
                    </div>

                    <pre className="bg-slate-900 text-amber-300/90 text-[10px] font-mono p-4 rounded-xl overflow-x-auto h-64 scrollbar-thin border border-slate-850 leading-normal select-all">
                      {SUPABASE_SQL_SCRIPT}
                    </pre>
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>

      </main>

      {/* FOOTER ACCENT */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 text-center text-xs text-slate-400">
        <div className="border-t border-slate-200 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Hệ thống quản lý Hụi (Huê) thông minh.</p>
          <div className="flex items-center gap-3">
            <span className="bg-violet-100 text-violet-800 font-bold px-2.5 py-0.5 rounded-full">Supabase Realtime Enabled</span>
            <span>•</span>
            <span>Bảo mật dữ liệu mã hóa đầu cuối</span>
          </div>
        </div>
      </footer>

      {/* --- MODALS --- */}

      {/* Modal: Admin Login PIN Verification */}
      {showAdminLogin && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-violet-700 to-indigo-800 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-amber-300" />
                <h3 className="font-extrabold text-base">Đăng Nhập Quyền Admin</h3>
              </div>
              <button
                onClick={() => {
                  setShowAdminLogin(false);
                  setAdminPin('');
                  setAdminPinError('');
                }}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAdminLogin} className="p-6 space-y-4">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-500 leading-relaxed space-y-1">
                <p className="font-bold text-slate-700">🔒 Xác thực quyền Admin</p>
                <p>Vui lòng nhập mã PIN để mở khóa các tác vụ quản trị viên (thêm/sửa/xóa thành viên, đổi trạng thái đóng tiền, gán người hốt hụi và duyệt bằng chứng).</p>
                <p className="text-violet-600 font-bold mt-1">💡 Gợi ý: Nhập "123456" hoặc "admin" hoặc để trống mã PIN để đăng nhập.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Mã PIN xác thực:
                </label>
                <input
                  type="password"
                  placeholder="••••••"
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-mono text-lg text-center rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-violet-500 tracking-widest"
                />
                {adminPinError && (
                  <p className="text-[11px] text-rose-600 font-semibold mt-1">{adminPinError}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-violet-600 to-indigo-700 hover:from-violet-700 hover:to-indigo-800 text-white py-3 rounded-xl font-bold text-sm shadow-md hover:shadow transition-all"
              >
                Xác nhận & Vào hệ thống
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Player */}
      {showAddPlayerModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-violet-700 to-indigo-800 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                <h3 className="font-extrabold text-base">Thêm Thành Viên Mới</h3>
              </div>
              <button onClick={() => setShowAddPlayerModal(false)} className="p-1.5 rounded-lg hover:bg-white/10 transition-all">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddPlayer} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Họ và tên người chơi:</label>
                <input
                  type="text"
                  placeholder="Nhập họ và tên..."
                  value={playerNameInput}
                  onChange={(e) => setPlayerNameInput(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Số điện thoại liên hệ:</label>
                <input
                  type="tel"
                  placeholder="Nhập số điện thoại..."
                  value={playerPhoneInput}
                  onChange={(e) => setPlayerPhoneInput(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-violet-600 to-indigo-700 text-white py-3 rounded-xl font-bold text-sm shadow-md transition-all"
              >
                Thêm Mới Thành Viên
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Player */}
      {showEditPlayerModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-violet-700 to-indigo-800 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="h-5 w-5" />
                <h3 className="font-extrabold text-base">Sửa Thông Tin Thành Viên</h3>
              </div>
              <button onClick={() => setShowEditPlayerModal(null)} className="p-1.5 rounded-lg hover:bg-white/10 transition-all">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditPlayer} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Họ và tên:</label>
                <input
                  type="text"
                  value={editPlayerNameInput}
                  onChange={(e) => setEditPlayerNameInput(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Số điện thoại:</label>
                <input
                  type="tel"
                  value={editPlayerPhoneInput}
                  onChange={(e) => setEditPlayerPhoneInput(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-violet-600 to-indigo-700 text-white py-3 rounded-xl font-bold text-sm shadow-md transition-all"
              >
                Lưu Thay Đổi
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Admin Upload Proof */}
      {showUploadProofModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-violet-700 to-indigo-800 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-amber-300" />
                <h3 className="font-extrabold text-sm md:text-base">
                  Đăng Bằng Chứng: {showUploadProofModal.player.name}
                </h3>
              </div>
              <button onClick={() => {
                setShowUploadProofModal(null);
                setProofBase64(null);
              }} className="p-1.5 rounded-lg hover:bg-white/10 transition-all">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAdminSubmitProof} className="p-6 space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                Bạn đang đăng hóa đơn bằng chứng thanh toán trực tiếp cho thành viên <strong>{showUploadProofModal.player.name}</strong> trong <strong>Tháng {showUploadProofModal.month}</strong>. Hệ thống sẽ tự động chuyển trạng thái của thành viên này thành <strong>Đã đóng (Đã duyệt)</strong>.
              </p>

              <div className="space-y-3">
                <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setProofType('file')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${proofType === 'file'
                        ? 'bg-white text-violet-700 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                      }`}
                  >
                    Chọn tệp ảnh
                  </button>
                  <button
                    type="button"
                    onClick={() => setProofType('url')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${proofType === 'url'
                        ? 'bg-white text-violet-700 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                      }`}
                  >
                    Link ảnh (URL)
                  </button>
                </div>

                {proofType === 'file' ? (
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center bg-slate-50 hover:bg-slate-100/50 transition-all relative cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      ref={fileInputModalRef}
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />

                    {proofBase64 ? (
                      <div className="space-y-2">
                        <img
                          src={proofBase64}
                          alt="Payment Proof Preview"
                          className="max-h-36 mx-auto rounded-lg shadow object-contain"
                        />
                        <p className="text-xs text-emerald-600 font-bold">Đã chọn ảnh</p>
                      </div>
                    ) : (
                      <div className="space-y-1 py-2">
                        <Upload className="h-6 w-6 text-slate-400 mx-auto" />
                        <p className="text-xs font-bold text-slate-700">Chọn ảnh hóa đơn chuyển khoản</p>
                        <p className="text-[10px] text-slate-400">&lt; 2.5MB</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <input
                    type="url"
                    placeholder="https://example.com/receipt-image.jpg"
                    value={proofUrlInput}
                    onChange={(e) => setProofUrlInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono"
                  />
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-violet-600 to-indigo-700 text-white py-3 rounded-xl font-bold text-sm shadow-md hover:shadow transition-all"
              >
                Lưu & Phê Duyệt Ngay
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Payment Proof (Lightbox) */}
      {showProofViewerModal && (
        <div className="fixed inset-0 bg-slate-900/85 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

            {/* Header info */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
              <div>
                <h3 className="font-extrabold text-base flex items-center gap-2">
                  <FileText className="h-5 w-5 text-amber-300" />
                  <span>Hóa Đơn Thanh Toán: {showProofViewerModal.player.name}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tháng đóng: {showProofViewerModal.payment.month_number} • Trạng thái: {
                    showProofViewerModal.payment.proof_status === 'approved' ? 'Đã duyệt' : 'Đang chờ duyệt'
                  }
                </p>
              </div>
              <button onClick={() => setShowProofViewerModal(null)} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Image Viewer */}
            <div className="bg-slate-950 p-6 flex items-center justify-center min-h-[300px] max-h-[500px] overflow-y-auto">
              {showProofViewerModal.payment.proof_url ? (
                <img
                  src={showProofViewerModal.payment.proof_url}
                  alt="Payment Proof Receipt"
                  className="max-w-full max-h-[400px] object-contain rounded-lg shadow-lg border border-slate-800"
                />
              ) : (
                <div className="text-slate-500 text-sm italic">Bằng chứng không có hình ảnh hợp lệ</div>
              )}
            </div>

            {/* Details & Admin actions */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 space-y-4">
              {showProofViewerModal.payment.notes && (
                <div className="bg-white p-3 rounded-xl border border-slate-250/50 text-xs">
                  <span className="font-bold text-slate-700 block mb-1">Ghi chú từ người gửi:</span>
                  <span className="text-slate-600 italic">"{showProofViewerModal.payment.notes}"</span>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                <div className="text-xs text-slate-500">
                  Thời gian gửi: {showProofViewerModal.payment.submitted_at ? new Date(showProofViewerModal.payment.submitted_at).toLocaleString('vi-VN') : '—'}
                </div>

                {isAdmin && showProofViewerModal.payment.proof_status === 'pending' && (
                  <div className="flex gap-2.5">
                    <button
                      onClick={() => handleApproveProof(showProofViewerModal.player.id, showProofViewerModal.payment.month_number, false)}
                      className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold text-xs rounded-xl transition-all"
                    >
                      Từ chối bằng chứng
                    </button>
                    <button
                      onClick={() => handleApproveProof(showProofViewerModal.player.id, showProofViewerModal.payment.month_number, true)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition-all"
                    >
                      Duyệt thanh toán
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Modal: Assign Hot Hui for the Month */}
      {showHotHuiModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-violet-700 to-indigo-800 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-300" />
                <h3 className="font-extrabold text-base">
                  Gán Hốt Hụi Tháng {showHotHuiModal.month}
                </h3>
              </div>
              <button onClick={() => {
                setShowHotHuiModal(null);
                setHotHuiPlayerId('');
                setBidAmountInput('0');
                setHotHuiNotes('');
              }} className="p-1.5 rounded-lg hover:bg-white/10 transition-all">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSetHotHui} className="p-6 space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                Chỉ định thành viên sẽ nhận được tiền hụi trong <strong>Tháng {showHotHuiModal.month}</strong>. Việc gán này sẽ giúp tự động cấn trừ tiền kêu hụi đối với các thành viên khác (Hụi Sống) và ghi nhận tiền cho người nhận.
              </p>

              {/* Choose Player */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Chọn người hốt hụi: <span className="text-rose-500">*</span>
                </label>
                <select
                  value={hotHuiPlayerId}
                  onChange={(e) => setHotHuiPlayerId(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500 font-medium"
                >
                  <option value="">-- Chọn thành viên --</option>
                  {/* Filter out players who already got hot hui in other months to make it easier, 
                      but allow re-selection in case of mistakes. Let's list all players. */}
                  {players.map(p => {
                    const gotHuiPrev = payments.find(pay => pay.player_id === p.id && pay.is_hot_hui && pay.month_number !== showHotHuiModal.month);
                    return (
                      <option key={p.id} value={p.id}>
                        {p.name} {gotHuiPrev ? `(Đã hốt ở Tháng ${gotHuiPrev.month_number})` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Bid Amount (Tiền kêu hụi) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Tiền kêu hụi (Tiền thăm): <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={bidAmountInput}
                    onChange={(e) => setBidAmountInput(e.target.value)}
                    required
                    min="0"
                    step="1000"
                    placeholder="Ví dụ: 200000"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl pl-4 pr-16 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500 font-bold"
                  />
                  <span className="absolute right-4 top-3 text-xs font-bold text-slate-400">VNĐ</span>
                </div>
                <p className="text-[10px] text-slate-400 italic">
                  Số tiền mà người này chấp nhận bỏ ra để giành quyền hốt hụi. Các thành viên "Hụi sống" khác sẽ được giảm số tiền đóng này.
                </p>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Ghi chú hốt hụi:
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Hốt hụi vì cần vốn kinh doanh..."
                  value={hotHuiNotes}
                  onChange={(e) => setHotHuiNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white py-3 rounded-xl font-bold text-sm shadow-md hover:shadow transition-all"
              >
                Gán Hốt Hụi & Cập Nhật Trạng Thái
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
