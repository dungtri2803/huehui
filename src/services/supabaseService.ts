import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface Player {
  id: string;
  name: string;
  phone: string;
  created_at?: string;
}

export interface Payment {
  id: string;
  player_id: string;
  month_number: number;
  paid: boolean;
  proof_url: string | null;
  proof_status: 'none' | 'pending' | 'approved';
  submitted_at?: string | null;
  notes?: string | null;
  is_hot_hui?: boolean;
  bid_amount?: number; // Số tiền kêu hụi (thăm hụi)
}

const supabaseUrl = "https://veowafencofcodabtbbe.supabase.co";
const supabaseKey = "sb_publishable_Jo0YlGcGnacqwh0G8LaeOg_lLuiqMjs";

// SQL script for setting up the database in Supabase
export const SUPABASE_SQL_SCRIPT = `-- 1. Tạo bảng người chơi (players)
CREATE TABLE IF NOT EXISTS players (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tạo bảng thanh toán và hốt hụi (payments)
CREATE TABLE IF NOT EXISTS payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    month_number INTEGER NOT NULL,
    paid BOOLEAN DEFAULT FALSE,
    proof_url TEXT, -- Lưu trữ ảnh dạng Base64 hoặc link URL
    proof_status TEXT DEFAULT 'none', -- 'none', 'pending', 'approved'
    submitted_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    is_hot_hui BOOLEAN DEFAULT FALSE,
    bid_amount NUMERIC DEFAULT 0,
    UNIQUE (player_id, month_number)
);

-- 3. Bật chế độ bảo mật Row Level Security (RLS) - Tùy chọn
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read access" ON players FOR SELECT USING (true);
CREATE POLICY "Allow anonymous write access" ON players FOR ALL USING (true);
CREATE POLICY "Allow anonymous read access" ON payments FOR SELECT USING (true);
CREATE POLICY "Allow anonymous write access" ON payments FOR ALL USING (true);
`;

// Let's define keys for localStorage connection settings only
const DB_URL_KEY = 'hui_manager_supabase_url';
const DB_KEY_KEY = 'hui_manager_supabase_key';

export class SupabaseService {
  private client: SupabaseClient | null = null;
  private mode: 'supabase' = 'supabase';

  constructor() {
    this.loadConfig();
  }

  public loadConfig() {
    const url = localStorage.getItem(DB_URL_KEY) || supabaseUrl;
    const key = localStorage.getItem(DB_KEY_KEY) || supabaseKey;

    try {
      this.client = createClient(url, key);
      this.mode = 'supabase';
    } catch (e) {
      console.error('Failed to initialize Supabase client:', e);
      // Fallback to defaults
      this.client = createClient(supabaseUrl, supabaseKey);
      this.mode = 'supabase';
    }
  }

  public setCredentials(url: string, key: string, _enable: boolean = true) {
    if (!url || !key) {
      localStorage.removeItem(DB_URL_KEY);
      localStorage.removeItem(DB_KEY_KEY);
      this.client = createClient(supabaseUrl, supabaseKey);
      this.mode = 'supabase';
      return true;
    }

    try {
      this.client = createClient(url, key);
      localStorage.setItem(DB_URL_KEY, url);
      localStorage.setItem(DB_KEY_KEY, key);
      this.mode = 'supabase';
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  public getCredentials() {
    return {
      url: localStorage.getItem(DB_URL_KEY) || supabaseUrl,
      key: localStorage.getItem(DB_KEY_KEY) || supabaseKey,
      mode: this.mode
    };
  }

  public setMode(_mode: 'supabase') {
    this.mode = 'supabase';
  }

  public getMode() {
    return this.mode;
  }

  // --- Players Operations ---

  public async getPlayers(): Promise<Player[]> {
    if (!this.client) {
      throw new Error('Supabase client is not initialized');
    }
    const { data, error } = await this.client
      .from('players')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Supabase error fetching players:', error);
      throw new Error(error.message);
    }
    return data || [];
  }

  public async addPlayer(name: string, phone: string): Promise<Player> {
    if (!this.client) {
      throw new Error('Supabase client is not initialized');
    }
    const { data, error } = await this.client
      .from('players')
      .insert([{ name, phone }])
      .select()
      .single();

    if (error) {
      console.error('Supabase error adding player:', error);
      throw new Error(error.message);
    }
    return data;
  }

  public async updatePlayer(id: string, name: string, phone: string): Promise<Player> {
    if (!this.client) {
      throw new Error('Supabase client is not initialized');
    }
    const { data, error } = await this.client
      .from('players')
      .update({ name, phone })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error updating player:', error);
      throw new Error(error.message);
    }
    return data;
  }

  public async deletePlayer(id: string): Promise<boolean> {
    if (!this.client) {
      throw new Error('Supabase client is not initialized');
    }
    // Cascading delete will delete payments automatically if foreign keys are configured
    // Otherwise we delete manually just in case
    await this.client.from('payments').delete().eq('player_id', id);

    const { error } = await this.client
      .from('players')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase error deleting player:', error);
      throw new Error(error.message);
    }
    return true;
  }

  // --- Payments Operations ---

  public async getPayments(monthNumber?: number): Promise<Payment[]> {
    if (!this.client) {
      throw new Error('Supabase client is not initialized');
    }
    let query = this.client.from('payments').select('*');
    if (monthNumber !== undefined) {
      query = query.eq('month_number', monthNumber);
    }
    const { data, error } = await query;
    if (error) {
      console.error('Supabase error fetching payments:', error);
      throw new Error(error.message);
    }
    return data || [];
  }

  public async savePayment(payment: Omit<Payment, 'id'> & { id?: string }): Promise<Payment> {
    if (!this.client) {
      throw new Error('Supabase client is not initialized');
    }
    const payload = {
      player_id: payment.player_id,
      month_number: payment.month_number,
      paid: payment.paid,
      proof_url: payment.proof_url,
      proof_status: payment.proof_status,
      is_hot_hui: payment.is_hot_hui || false,
      bid_amount: payment.bid_amount || 0,
      notes: payment.notes || '',
      submitted_at: payment.submitted_at || new Date().toISOString()
    };

    const { data, error } = await this.client
      .from('payments')
      .upsert([payload], { onConflict: 'player_id,month_number' })
      .select()
      .single();

    if (error) {
      console.error('Supabase error upserting payment:', error);
      throw new Error(error.message);
    }
    return data;
  }

  public async updatePaymentStatus(
    playerId: string,
    monthNumber: number,
    updates: Partial<Omit<Payment, 'id' | 'player_id' | 'month_number'>>
  ): Promise<Payment> {
    if (!this.client) {
      throw new Error('Supabase client is not initialized');
    }
    // Get current payment or upsert
    const { data: existing } = await this.client
      .from('payments')
      .select('*')
      .eq('player_id', playerId)
      .eq('month_number', monthNumber)
      .maybeSingle();

    const payload = {
      player_id: playerId,
      month_number: monthNumber,
      paid: updates.paid !== undefined ? updates.paid : (existing?.paid ?? false),
      proof_url: updates.proof_url !== undefined ? updates.proof_url : (existing?.proof_url ?? null),
      proof_status: updates.proof_status !== undefined ? updates.proof_status : (existing?.proof_status ?? 'none'),
      is_hot_hui: updates.is_hot_hui !== undefined ? updates.is_hot_hui : (existing?.is_hot_hui ?? false),
      bid_amount: updates.bid_amount !== undefined ? updates.bid_amount : (existing?.bid_amount ?? 0),
      notes: updates.notes !== undefined ? updates.notes : (existing?.notes ?? ''),
      submitted_at: updates.submitted_at !== undefined ? updates.submitted_at : (existing?.submitted_at ?? new Date().toISOString())
    };

    const { data, error } = await this.client
      .from('payments')
      .upsert([payload], { onConflict: 'player_id,month_number' })
      .select()
      .single();

    if (error) {
      console.error('Supabase error updating payment:', error);
      throw new Error(error.message);
    }
    return data;
  }

  // Test connection query to see if Supabase works
  public async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.client) {
      return { success: false, message: 'Supabase client chưa được khởi tạo. Vui lòng điền URL và Key.' };
    }
    try {
      const { error } = await this.client.from('players').select('id').limit(1);
      if (error) {
        if (error.code === '42P01') {
          return {
            success: true,
            message: 'Kết nối thành công với Supabase! Tuy nhiên bảng "players" chưa tồn tại. Vui lòng chạy đoạn mã SQL khởi tạo dưới đây trong SQL Editor của Supabase.'
          };
        }
        return { success: false, message: `Lỗi Supabase: ${error.message} (Code: ${error.code})` };
      }
      return { success: true, message: 'Kết nối thành công! Cơ sở dữ liệu đã sẵn sàng hoạt động.' };
    } catch (e: any) {
      return { success: false, message: `Không thể kết nối: ${e?.message || e}` };
    }
  }
}

export const dbService = new SupabaseService();
