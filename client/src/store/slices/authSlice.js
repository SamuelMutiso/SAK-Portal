import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api, { errorMessage } from "../../api/client";

function saveSession(data) {
  localStorage.setItem("access_token", data.access_token);
  localStorage.setItem("refresh_token", data.refresh_token);
  localStorage.setItem("user", JSON.stringify(data.user));
}

export const login = createAsyncThunk("auth/login", async (credentials, { rejectWithValue }) => {
  try {
    const { data } = await api.post("/auth/login", credentials);
    if (data.two_factor_required) return { twoFactor: { challenge: data.challenge, name: data.name } };
    saveSession(data);
    return { user: data.user };
  } catch (error) {
    return rejectWithValue(errorMessage(error));
  }
});

export const verifyTwoFactor = createAsyncThunk("auth/verifyTwoFactor", async ({ challenge, code }, { rejectWithValue }) => {
  try {
    const { data } = await api.post("/auth/2fa/verify", { challenge, code });
    saveSession(data);
    return { user: data.user };
  } catch (error) {
    return rejectWithValue(errorMessage(error));
  }
});

if (import.meta.env.VITE_DEMO_MODE === "true") {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user");
}

function savedUser() {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
}

const authSlice = createSlice({
  name: "auth",
  initialState: { user: savedUser(), status: "idle", error: null, twoFactor: null },
  reducers: {
    clearAuthError(state) {
      state.error = null;
    },
    sessionRenewed(state, action) {
      saveSession(action.payload);
      state.user = action.payload.user;
    },
    cancelTwoFactor(state) {
      state.twoFactor = null;
      state.error = null;
    },
    consentAccepted(state) {
      state.user = { ...state.user, consent_required: false };
      localStorage.setItem("user", JSON.stringify(state.user));
    },
    logout(state) {
      localStorage.clear();
      state.user = null;
      state.status = "idle";
      state.twoFactor = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = "idle";
        state.user = action.payload.user || null;
        state.twoFactor = action.payload.twoFactor || null;
      })
      .addCase(login.rejected, (state, action) => {
        state.status = "idle";
        state.error = action.payload;
      })
      .addCase(verifyTwoFactor.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(verifyTwoFactor.fulfilled, (state, action) => {
        state.status = "idle";
        state.user = action.payload.user;
        state.twoFactor = null;
      })
      .addCase(verifyTwoFactor.rejected, (state, action) => {
        state.status = "idle";
        state.error = action.payload;
      });
  },
});

export const { cancelTwoFactor, clearAuthError, consentAccepted, logout, sessionRenewed } = authSlice.actions;
export default authSlice.reducer;
