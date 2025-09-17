// src/i18n/I18nContext.js
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// 사전은 한 파일에 몰아서 관리 (요구: 미리 준비된 번역 적용, 자동번역 X)
const DICT = {
  ko: {
    // Auth & Common
    LOGIN: "로그인",
    SIGN_UP: "회원가입",
    EMAIL: "이메일",
    EMAIL_PH: "이메일",
    PASSWORD: "비밀번호",
    PW_PH: "비밀번호 (8자리 이상)",
    PASSWORD_MIN: "비밀번호 (8자리 이상)",
    PASSWORD_8: "비밀번호 (8자리 이상)",
    PASSWORD_CONFIRM: "새 비밀번호 확인",
    INPUT_REQUIRED: "입력 필요",
    ENTER_ID_PW: "아이디와 비밀번호를 입력해주세요.",
    TRY_AGAIN: "다시 시도해주세요.",
    CONFIRM: "확인",
    CANCEL: "취소",
    EDIT: "수정",
    EDIT_DONE: "수정 완료",
    LOADING: "불러오는 중…",
    LOGOUT: "로그아웃",
    GO_SIGNUP: "회원가입",
    FIND_ID: "아이디 찾기",
    PW_RECOVERY: "비밀번호 복구",
    REQUIRED: "필수 입력",
    REQUIRED_ALL: "모든 항목을 입력해 주세요.",
    FORMAT_ERROR: "형식 오류",
    PW_MIN_8: "비밀번호는 8자리 이상이어야 합니다.",
    NUM_ONLY: "숫자로 입력하세요.",
    PROCESSING: "처리 중…",
    CREATE_ACCOUNT: "계정 만들기",
    ALREADY_HAVE_ACCOUNT: "이미 계정이 있나요?",
    ERR_WRONG_PW: "비밀번호가 틀렸습니다.",
    ERR_ID_NOT_FOUND: "존재하지 않는 아이디입니다.",
    ERR_ID_EXISTS: "이미 사용 중인 아이디입니다.",
    ERR_TOKEN: "토큰이 만료되었습니다.",
    ERR_COMMON: "문제가 발생했습니다. 다시 시도해 주세요.",

    // Tabs
    START: "시작",
    HOME: "홈",
    HOME_MEAL: "🥗 식단 기록",
    HOME_DATA: "👀 한눈에",
    PROFILE: "PROFILE",
    QUEST: "QUEST",
    RANKING: "RANKING",
    SETTINGS: "SETTINGS",

    // Camera & Meal
    CAMERA: "카메라",
    CAMERA_HINT: "접시가 중앙에 오도록 맞춰주세요",
    PERMISSION_CAMERA_NEEDED: "카메라 권한이 필요합니다",
    PERMISSION_ALLOW: "권한 허용",
    SAVE: "저장",
    RETAKE: "다시 찍기",
    RESULT: "분석 결과",
    GOAL_SETUP: "목표 설정",
    LATER: "나중에 설정",
    FETCHING: "불러오는 중…",
    NO_LIST: "표시할 항목이 없습니다.",
    DIET: "식단",

    // Profile
    PROFILE_TITLE: "PROFILE",
    ACCOUNT_INFO: "계정 정보",
    CURRENT_EMAIL: "현재 이메일",
    PROFILE_INFO: "프로필 정보",
    WEIGHT: "체중(kg)",
    HEIGHT: "키(cm)",
    AGE: "나이",
    GENDER: "성별",
    MALE: "남성",
    FEMALE: "여성",
    TARGET_WEIGHT: "목표 체중(kg)",
    TARGET_CALORIES: "목표 칼로리(kcal)",
    UPDATE_OK: "수정이 완료되었습니다.",
    UPDATE_FAIL: "수정에 실패했습니다.",
    EMAIL_INVALID: "이메일 형식이 올바르지 않습니다.",
    PW_TOO_SHORT: "새 비밀번호는 8자 이상이어야 합니다.",
    PW_MISMATCH: "새 비밀번호 확인이 일치하지 않습니다.",
    NUMERIC_ONLY: "숫자 항목은 숫자로 입력하세요.",

    // Quest/Ranking
    WALK: "걷기",
    PUSHUP: "푸시업",
    SQUAT: "스쿼트",
    DAILY_QUESTS: "오늘의 일일 퀘스트",
    REWARD: "보상",
    ALL_CLEARED_BONUS: "모두 완료 보너스",
    NEW: "신규",
    DONE: "완료",
    AUTO: "자동",
    LOCATION_OK: "위치 사용 가능",
    LOCATION_NEEDED: "권한 필요: 위치",
    ANDROID_LOCATION_HINT: "정확도 높음, 배터리 최적화 제외 권장",
    ANDROID_ACCURACY_HINT: "정확도 높음, 배터리 최적화 제외 권장",
    OPEN_SETTINGS: "설정 열기",
    RANKING_EMPTY: "표시할 랭킹이 없습니다.",
    LIST_LOAD_FAIL: "목록을 불러오지 못했습니다.",
    USERS_EMPTY: "표시할 사용자가 없습니다.",

    // Settings
    LANGUAGE: "언어",
    SOUND: "효과음",
    ON: "켜기",
    OFF: "끄기",

    // Password Recovery
    RECOVERY: "비밀번호 복구",
    RECOVERY_SETUP: "보안질문 설정",
    RECOVERY_START_DESC: "아이디를 입력하면 질문 2개가 출제됩니다.",
    RECOVERY_ID: "아이디(이메일)",
    RECOVERY_START: "질문 받기",
    RECOVERY_ANSWER: "정답 제출",
    RECOVERY_NEW_PW: "새 비밀번호",
    RECOVERY_RESET: "비밀번호 재설정",
    RECOVERY_REGISTER_DESC: "질문 3개를 선택하고 정답/확인으로 등록하세요.",
    QUESTION_BIRTHPLACE: "내가 태어난 곳은?",
    QUESTION_ELEMENTARY_SCHOOL: "내가 다니던 초등학교는?",
    QUESTION_PET_NAME: "내 애완동물 이름은?",
    QUESTION_MOTHER_NAME: "내 어머니 이름은?",
    ANSWER: "정답",
    ANSWER_CONFIRM: "정답 확인",
    SEND: "전송",

    // ✅ TTS 기능 추가: TACoach.jsx에서 사용
    TOD_DAWN: "새벽",
    TOD_MORNING: "아침",
    TOD_AFTERNOON: "오후",
    TOD_EVENING: "저녁",
    WORKOUT: "운동",
    GREETING:
      "안녕하세요! 저는 바벨몬 트레이너에요. ${tod}에도 ${mode} 신나게 해봐요!",
    REPS_UNIT: "개",
    REPS_UNIT_TTS: " ",
    AUTO_COUNT_START: "자동 카운트를 시작할게요.",
    TONE_SOFT: "부드럽게",
    TONE_HARD: "강하게",
    TONE_MIX: "랜덤",
    TONE_CHANGE: "톤을 ${tone}으로 바꿀게요.",
    RESET: "초기화",
    PAUSE: "일시정지",
    TONE_LABEL: "톤",
    TONE_VALUE: "",

    // ✅ TTS 격려/도발 메시지
    MOTIVATE: [
      "좋아요! 이렇게 꾸준히 하면 금방 늘어요.",
      "한 개씩 차근차근, 잘 하고 있어요!",
      "운동하는 모습 멋져요, 계속 가요!",
      "지금처럼만 하면 목표 금방 도달할 거예요.",
      "조금만 더, 분명히 성장하고 있어요!",
      "꾸준함이 근육을 만듭니다. 잘하고 있어요!",
      "포기하지 않는 게 제일 큰 힘이에요!",
      "호흡 일정하게, 지금 완벽해요!",
      "몸이 점점 강해지고 있어요, 느껴지죠?",
      "한 번 더! 그게 오늘의 차이를 만듭니다.",
      "힘든 만큼 보상은 크게 돌아와요.",
      "오늘도 자신과의 약속을 지키고 있네요!",
      "운동은 배신하지 않아요. 계속해요!",
      "조금 힘들어도 내일의 나를 위해 가는 거예요.",
      "멋진 페이스예요, 끝까지 화이팅!",
    ],
    SPICY: [
      "이 정도에 힘들면 엘리베이터도 운동이지요?",
      "킹받지? 그럼 한 개만 더.",
      "근손실이 전화했어요. 빨리 움직이라네요.",
      "오늘도 포기 전문가가 되실 건가요?",
      "운동은 마음이 아니라 몸으로 하는 겁니다.",
      "이 속도로는 군고구마도 다 타겠다.",
      "땀 좀 흘려봐요, 눈물 말고요.",
      "지금 멈추면 내일 더 하기 싫을 텐데요?",
      "헬스장 대신 침대랑 계약했나요?",
      "근육은 배신 안 해요, 대신 의자랑 친해지겠죠.",
      "앉아 있는 게 더 편하죠? 그게 문제예요.",
      "몸이 아니라 변명만 성장 중이네요?",
      "운동은 공짜지만 후회는 유료입니다.",
      "운동 중 포기? 오늘도 의자 MVP!",
      "열정은 어디 두고 오신 거예요?",
      "거울이랑 눈 못 마주치게 될걸요?",
    ],

    // 보안설정
    SECURITY_SETTINGS: "보안 설정",
    SECURITY_VERIFY_HINT: "보안 설정을 위해 비밀번호를 입력해주세요.",
    SECURITY_QNA: "보안 질문 & 답변",
    SECURITY_QNA_NOT_SET: "보안 질문이 설정되지 않았습니다.",
    SECURITY_POLICY: "계정 복구를 위해 보안 질문과 답변을 설정하세요.",
    TOKEN_INVALID_OR_EXPIRED: "토큰이 유효하지 않거나 만료되었습니다.",
    TOKEN_INVALID: "토큰이 유효하지 않습니다.",
    ANSWER: "답변",
    INCORRECT_ANSWER: "답이 올바르지 않습니다.",
    QUESTION_PET_NAME: "내 애완동물 이름은?",
    QUESTION_BIRTHPLACE: "내가 태어난 곳은?",
    QUESTION_MOTHER_NAME: "내 어머니 이름은?",
    QUESTION_FAVORITE_TEACHER: "가장 기억에 남는 선생님 성함",
    QUESTION_FAVORITE_FOOD: "가장 좋아하는 음식",
    QUESTION_FIRST_SCHOOL: "처음 다닌 학교 이름",
    QUESTION_FAVORITE_COLOR: "가장 좋아하는 색",
    QUESTION_BEST_FRIEND: "가장 친한 친구 이름",
  },

  ////////////////////////////////////////////////////////////////////////////////////////////////

  en: {
    // Auth & Common
    LOGIN: "Login",
    SIGN_UP: "Sign Up",
    EMAIL: "Email",
    EMAIL_PH: "Email",
    PASSWORD: "Password",
    PW_PH: "Password (8+ chars)",
    PASSWORD_MIN: "Password (8+ chars)",
    PASSWORD_8: "Password (8+ chars)",
    PASSWORD_CONFIRM: "Confirm new password",
    INPUT_REQUIRED: "Input required",
    ENTER_ID_PW: "Please enter your ID and password.",
    TRY_AGAIN: "Please try again.",
    CONFIRM: "Confirm",
    CANCEL: "Cancel",
    EDIT: "Edit",
    EDIT_DONE: "Edit Done",
    LOADING: "Loading...",
    LOGOUT: "Logout",
    GO_SIGNUP: "Sign Up",
    FIND_ID: "Find ID",
    PW_RECOVERY: "Password Recovery",
    REQUIRED: "Required",
    REQUIRED_ALL: "All fields are required.",
    FORMAT_ERROR: "Format error",
    PW_MIN_8: "Password must be at least 8 characters.",
    NUM_ONLY: "Enter numbers only.",
    PROCESSING: "Processing…",
    CREATE_ACCOUNT: "Create Account",
    ALREADY_HAVE_ACCOUNT: "Already have an account?",
    ERR_WRONG_PW: "Incorrect password.",
    ERR_ID_NOT_FOUND: "ID not found.",
    ERR_ID_EXISTS: "This ID is already in use.",
    ERR_TOKEN: "Token expired.",
    ERR_COMMON: "An error occurred. Please try again.",

    // Tabs
    START: "Start",
    HOME: "Home",
    HOME_MEAL: "🥗 Meal Log",
    HOME_DATA: "👀 At a Glance",
    PROFILE: "PROFILE",
    QUEST: "QUEST",
    RANKING: "RANKING",
    SETTINGS: "SETTINGS",

    // Camera & Meal
    CAMERA: "Camera",
    CAMERA_HINT: "Please center the plate in the frame",
    PERMISSION_CAMERA_NEEDED: "Camera permission is required",
    PERMISSION_ALLOW: "Allow",
    SAVE: "Save",
    RETAKE: "Retake",
    RESULT: "Analysis Result",
    GOAL_SETUP: "Set Goals",
    LATER: "Later",
    FETCHING: "Fetching...",
    NO_LIST: "No items to display.",
    DIET: "Diet",

    // Profile
    PROFILE_TITLE: "PROFILE",
    ACCOUNT_INFO: "Account Info",
    CURRENT_EMAIL: "Current Email",
    PROFILE_INFO: "Profile Info",
    WEIGHT: "Weight(kg)",
    HEIGHT: "Height(cm)",
    AGE: "Age",
    GENDER: "Gender",
    MALE: "Male",
    FEMALE: "Female",
    TARGET_WEIGHT: "Target Weight(kg)",
    TARGET_CALORIES: "Target Calories(kcal)",
    UPDATE_OK: "Update successful.",
    UPDATE_FAIL: "Update failed.",
    EMAIL_INVALID: "Email format is invalid.",
    PW_TOO_SHORT: "New password must be at least 8 characters.",
    PW_MISMATCH: "New password confirmation does not match.",
    NUMERIC_ONLY: "Numeric fields only accept numbers.",

    // Quest/Ranking
    WALK: "Walk",
    PUSHUP: "Push-up",
    SQUAT: "Squat",
    DAILY_QUESTS: "Daily Quests",
    REWARD: "Reward",
    ALL_CLEARED_BONUS: "All Cleared Bonus",
    NEW: "New",
    DONE: "Done",
    AUTO: "Auto",
    LOCATION_OK: "Location available",
    LOCATION_NEEDED: "Permission required: Location",
    ANDROID_LOCATION_HINT:
      "High accuracy, recommend exempting from battery optimization",
    ANDROID_ACCURACY_HINT:
      "High accuracy, recommend exempting from battery optimization",
    OPEN_SETTINGS: "Open Settings",
    RANKING_EMPTY: "No rankings to display.",
    LIST_LOAD_FAIL: "Failed to load list.",
    USERS_EMPTY: "No users to display.",

    // Settings
    LANGUAGE: "Language",
    SOUND: "Sound",
    ON: "On",
    OFF: "Off",

    // Password Recovery
    RECOVERY: "Password Recovery",
    RECOVERY_SETUP: "Security Questions",
    RECOVERY_START_DESC: "Enter your email to get 2 questions.",
    RECOVERY_ID: "ID (email)",
    RECOVERY_START: "Get Questions",
    RECOVERY_ANSWER: "Submit Answers",
    RECOVERY_NEW_PW: "New Password",
    RECOVERY_RESET: "Reset Password",
    RECOVERY_REGISTER_DESC: "Select 3 questions and register your answers.",
    QUESTION_BIRTHPLACE: "Where were you born?",
    QUESTION_ELEMENTARY_SCHOOL: "Which elementary school did you attend?",
    QUESTION_PET_NAME: "What is your pet's name?",
    QUESTION_MOTHER_NAME: "What is your mother's name?",
    ANSWER: "Answer",
    ANSWER_CONFIRM: "Confirm Answer",
    SEND: "Send",

    // ✅ TTS 기능 추가: TACoach.jsx에서 사용
    TOD_DAWN: "Early morning",
    TOD_MORNING: "Morning",
    TOD_AFTERNOON: "Afternoon",
    TOD_EVENING: "Evening",
    WORKOUT: "Workout",
    GREETING:
      "Hello! I'm Barbellmon trainer. Let's have a fun ${mode} this ${tod}!",
    REPS_UNIT: "Reps",
    REPS_UNIT_TTS: " ",
    AUTO_COUNT_START: "I will start auto counting.",
    TONE_SOFT: "Soft",
    TONE_HARD: "Hard",
    TONE_MIX: "Random",
    TONE_CHANGE: "I will change the tone to ${tone}.",
    RESET: "Reset",
    PAUSE: "Pause",
    TONE_LABEL: "Tone",
    TONE_VALUE: "",

    // ✅ TTS 격려/도발 메시지
    MOTIVATE: [
      "Good! If you keep it up, you will improve quickly.",
      "One by one, step by step, you are doing great!",
      "Your dedication is cool, keep it going!",
      "If you keep this pace, you'll reach your goal soon.",
      "Just a little more, you are definitely growing!",
      "Consistency builds muscles. You are doing great!",
      "Not giving up is the greatest strength!",
      "Keep your breathing steady, it's perfect now!",
      "Your body is getting stronger, can't you feel it?",
      "One more! That makes today's difference.",
      "The harder you work, the greater the reward.",
      "You are keeping the promise you made to yourself today!",
      "Exercise never betrays you. Keep going!",
      "Even if it's a bit tough, you're doing it for your future self.",
      "Great pace, all the way!",
    ],
    SPICY: [
      "If this is tough, even the elevator is a workout, isn't it?",
      "You mad? Then do just one more.",
      "Muscle loss called. Said to get moving.",
      "Are you going to be a quitting expert today too?",
      "Exercise is done with the body, not the mind.",
      "At this rate, the roasted sweet potato will burn completely.",
      "Break a sweat, not tears.",
      "If you stop now, you'll hate it even more tomorrow.",
      "Did you get a contract with the bed instead of the gym?",
      "Muscles don't betray you, but you'll become friends with the chair.",
      "Sitting is more comfortable, isn't it? That's the problem.",
      "Is only your excuses getting stronger?",
      "Exercise is free, but regret is a premium feature.",
      "Giving up during a workout? You're the MVP of the chair today!",
      "Where did you leave your passion?",
      "You won't be able to look at yourself in the mirror.",
    ],

    //보안설정
    SECURITY_SETTINGS: "Security Settings",
    SECURITY_VERIFY_HINT: "Please enter your password for security settings.",
    SECURITY_QNA: "Security Q&A",
    SECURITY_QNA_NOT_SET: "Security questions are not set.",
    TOKEN_INVALID_OR_EXPIRED: "The token is invalid or has expired.",
    TOKEN_INVALID: "The token is invalid.",
    SECURITY_POLICY:
    "Set up security questions and answers for account recovery.",
    ANSWER: "Answer",
    INCORRECT_ANSWER: "The answer is incorrect.",
    QUESTION_PET_NAME: "What is your pet's name?",
    QUESTION_BIRTHPLACE: "Where were you born?",
    QUESTION_MOTHER_NAME: "What is your mother's name?",
    QUESTION_FAVORITE_TEACHER: "What is the name of your favorite teacher?",
    QUESTION_FAVORITE_FOOD: "What is your favorite food?",
    QUESTION_FIRST_SCHOOL: "What was the name of your first school?",
    QUESTION_FAVORITE_COLOR: "What is your favorite color?",
    QUESTION_BEST_FRIEND: "What is your best friend's name?",
  },

  ////////////////////////////////////////////////////////////////////////////////////////////////

  ja: {
    // Auth & Common
    LOGIN: "ログイン",
    SIGN_UP: "サインアップ",
    EMAIL: "メール",
    EMAIL_PH: "メール",
    PASSWORD: "パスワード",
    PW_PH: "パスワード (8文字以上)",
    PASSWORD_MIN: "パスワード (8文字以上)",
    PASSWORD_8: "パスワード (8文字以上)",
    PASSWORD_CONFIRM: "新しいパスワードの確認",
    INPUT_REQUIRED: "入力が必要です",
    ENTER_ID_PW: "IDとパスワードを入力してください。",
    TRY_AGAIN: "もう一度お試しください。",
    CONFIRM: "確認",
    CANCEL: "キャンセル",
    EDIT: "修正",
    EDIT_DONE: "修正完了",
    LOADING: "読み込み中…",
    LOGOUT: "ログアウト",
    GO_SIGNUP: "サインアップ",
    FIND_ID: "IDを探す",
    PW_RECOVERY: "パスワード回復",
    REQUIRED: "必須",
    REQUIRED_ALL: "すべての項目を入力してください。",
    FORMAT_ERROR: "形式エラー",
    PW_MIN_8: "パスワードは8文字以上である必要があります。",
    NUM_ONLY: "数字を入力してください。",
    PROCESSING: "処理中…",
    CREATE_ACCOUNT: "アカウントを作成",
    ALREADY_HAVE_ACCOUNT: "すでにアカウントを持っていますか？",
    ERR_WRONG_PW: "パスワードが正しくありません。",
    ERR_ID_NOT_FOUND: "存在しないIDです。",
    ERR_ID_EXISTS: "このIDはすでに使用されています。",
    ERR_TOKEN: "トークンが期限切れです。",
    ERR_COMMON: "問題が発生しました。もう一度お試しください。",

    // Tabs
    START: "開始",
    HOME: "ホーム",
    HOME_MEAL: "🥗 食事記録",
    HOME_DATA: "👀 一目で",
    PROFILE: "プロフィール",
    QUEST: "クエスト",
    RANKING: "ランキング",
    SETTINGS: "設定",

    // Camera & Meal
    CAMERA: "カメラ",
    CAMERA_HINT: "お皿が中央に来るように合わせてください",
    PERMISSION_CAMERA_NEEDED: "カメラの権限が必要です",
    PERMISSION_ALLOW: "権限を許可",
    SAVE: "保存",
    RETAKE: "撮り直し",
    RESULT: "分析結果",
    GOAL_SETUP: "目標設定",
    LATER: "後で設定",
    FETCHING: "読み込み中…",
    NO_LIST: "表示する項目がありません。",
    DIET: "食事",

    // Profile
    PROFILE_TITLE: "プロフィール",
    ACCOUNT_INFO: "アカウント情報",
    CURRENT_EMAIL: "現在のメール",
    PROFILE_INFO: "プロフィール情報",
    WEIGHT: "体重(kg)",
    HEIGHT: "身長(cm)",
    AGE: "年齢",
    GENDER: "性別",
    MALE: "男性",
    FEMALE: "女性",
    TARGET_WEIGHT: "目標体重(kg)",
    TARGET_CALORIES: "目標カロリー(kcal)",
    UPDATE_OK: "修正が完了しました。",
    UPDATE_FAIL: "修正に失敗しました。",
    EMAIL_INVALID: "メールの形式が正しくありません。",
    PW_TOO_SHORT: "新しいパスワードは8文字以上である必要があります。",
    PW_MISMATCH: "新しいパスワードの確認が一致しません。",
    NUMERIC_ONLY: "数字項目は数字で入力してください。",

    // Quest/Ranking
    WALK: "歩く",
    PUSHUP: "プッシュアップ",
    SQUAT: "スクワット",
    DAILY_QUESTS: "今日の日替わりクエスト",
    REWARD: "報酬",
    ALL_CLEARED_BONUS: "すべて完了ボーナス",
    NEW: "新規",
    DONE: "完了",
    AUTO: "自動",
    LOCATION_OK: "位置情報利用可能",
    LOCATION_NEEDED: "権限が必要です：位置情報",
    ANDROID_LOCATION_HINT:
      "高精度、バッテリー最適化の対象外にすることをお勧めします",
    ANDROID_ACCURACY_HINT:
      "高精度、バッテリー最適化の対象外にすることをお勧めします",
    OPEN_SETTINGS: "設定を開く",
    RANKING_EMPTY: "表示するランキングがありません。",
    LIST_LOAD_FAIL: "リストを読み込めませんでした。",
    USERS_EMPTY: "表示するユーザーがいません。",

    // Settings
    LANGUAGE: "言語",
    SOUND: "効果音",
    ON: "オン",
    OFF: "オフ",

    // Password Recovery
    RECOVERY: "パスワード回復",
    RECOVERY_SETUP: "秘密の質問設定",
    RECOVERY_START_DESC: "IDを入力すると、2つの質問が出題されます。",
    RECOVERY_ID: "ID(メール)",
    RECOVERY_START: "質問を取得",
    RECOVERY_ANSWER: "答えを提出",
    RECOVERY_NEW_PW: "新しいパスワード",
    RECOVERY_RESET: "パスワードをリセット",
    RECOVERY_REGISTER_DESC: "3つの質問を選択して答え/確認を登録してください。",
    QUESTION_BIRTHPLACE: "生まれた場所は？",
    QUESTION_ELEMENTARY_SCHOOL: "通っていた小学校は？",
    QUESTION_PET_NAME: "ペットの名前は？",
    QUESTION_MOTHER_NAME: "母の名前は？",
    ANSWER: "答え",
    ANSWER_CONFIRM: "答えの確認",
    SEND: "送信",

    // ✅ TTS 기능 추가: TACoach.jsx에서 사용
    TOD_DAWN: "明け方",
    TOD_MORNING: "朝",
    TOD_AFTERNOON: "午後",
    TOD_EVENING: "夜",
    WORKOUT: "運動",
    GREETING:
      "こんにちは！私はバーベルモントレーナーです。この${tod}も${mode}を楽しくやりましょう！",
    REPS_UNIT: "回",
    REPS_UNIT_TTS: " ",
    AUTO_COUNT_START: "自動カウントを開始します。",
    TONE_SOFT: "優しく",
    TONE_HARD: "厳しく",
    TONE_MIX: "ランダム",
    TONE_CHANGE: "トーンを${tone}に変えます。",
    RESET: "リセット",
    PAUSE: "一時停止",
    TONE_LABEL: "トーン",
    TONE_VALUE: "",

    // ✅ TTS 격려/도발 메시지
    MOTIVATE: [
      "いいですね！このように続けるとすぐに上達します。",
      "一つずつ着実に、うまくやっています！",
      "運動している姿がかっこいいです、続けていきましょう！",
      "この調子なら目標にすぐ到達するでしょう。",
      "もう少し、確実に成長しています！",
      "継続が筋肉を作ります。よくやっています！",
      "諦めないのが一番の力です！",
      "呼吸を一定に、完璧です！",
      "体がどんどん強くなっているのが感じられますか？",
      "もう一度！それが今日の違いを生み出します。",
      "つらい分だけ、大きな報酬が返ってきます。",
      "今日も自分との約束を守っていますね！",
      "運動は裏切りません。続けましょう！",
      "少しつらくても明日の自分のために頑張るんです。",
      "素晴らしいペースです、最後までファイト！",
    ],
    SPICY: [
      "この程度でつらいなら、エレベーターも運動ですね？",
      "ムカついた？それならもう一つだけ。",
      "筋肉の損失から電話がかかってきました。早く動けって。",
      "今日も諦め専門家になりますか？",
      "運動は心がではなく体でするものです。",
      "この速度では焼き芋も全部焦げますよ。",
      "汗を流してください、涙ではなく。",
      "今やめたら、明日もっとやる気がなくなりますよ？",
      "ジムの代わりにベッドと契約しましたか？",
      "筋肉は裏切りません。代わりに椅子と仲良くなるでしょう。",
      "座っている方が楽ですよね？それが問題です。",
      "体ではなく言い訳だけが成長していますね？",
      "運動は無料ですが、後悔は有料です。",
      "運動中に諦める？今日も椅子のMVP！",
      "情熱はどこに置いてきたんですか？",
      "鏡と目を合わせられなくなりますよ？",
    ],
    //보안설정
    SECURITY_SETTINGS: "セキュリティ設定",
    SECURITY_VERIFY_HINT:
      "セキュリティ設定のため、パスワードを入力してください。",
    SECURITY_QNA: "セキュリティQ&A",
    SECURITY_QNA_NOT_SET: "セキュリティ質問が設定されていません。",
    SECURITY_VERIFY_HINT: "セキュリティ質問を登録・修正するには、もう一度パスワードを入力してください。",
    TOKEN_INVALID_OR_EXPIRED: "トークンが無効であるか、期限切れです。",
    TOKEN_INVALID: "トークンが無効です。",
    SECURITY_POLICY:
    "アカウント復旧のため、セキュリティQ&Aを設定してください。",
    ANSWER: "答え",
    INCORRECT_ANSWER: "回答が正しくありません。",
    QUESTION_PET_NAME: "あなたのペットの名前は？",
    QUESTION_BIRTHPLACE: "あなたが生まれた場所は？",
    QUESTION_MOTHER_NAME: "あなたのお母さんの名前は？",
    QUESTION_FAVORITE_TEACHER: "最も記憶に残っている先生の名前は？",
    QUESTION_FAVORITE_FOOD: "好きな食べ物は何ですか？",
    QUESTION_FIRST_SCHOOL: "初めて通った学校の名前は？",
    QUESTION_FAVORITE_COLOR: "好きな色は何ですか？",
    QUESTION_BEST_FRIEND: "親友の名前は？",
  },

  ///////////////////////////////////////////////////////////////////////////////////////////////

  zh: {
    // Auth & Common
    LOGIN: "登录",
    SIGN_UP: "注册",
    EMAIL: "邮箱",
    EMAIL_PH: "邮箱",
    PASSWORD: "密码",
    PW_PH: "密码 (8位以上)",
    PASSWORD_MIN: "密码 (8位以上)",
    PASSWORD_8: "密码 (8位以上)",
    PASSWORD_CONFIRM: "确认新密码",
    INPUT_REQUIRED: "需要输入",
    ENTER_ID_PW: "请输入您的账号和密码。",
    TRY_AGAIN: "请再试一次。",
    CONFIRM: "确认",
    CANCEL: "取消",
    EDIT: "编辑",
    EDIT_DONE: "编辑完成",
    LOADING: "加载中…",
    LOGOUT: "注销",
    GO_SIGNUP: "注册",
    FIND_ID: "找回账号",
    PW_RECOVERY: "找回密码",
    REQUIRED: "必需",
    REQUIRED_ALL: "所有字段都是必需的。",
    FORMAT_ERROR: "格式错误",
    PW_MIN_8: "密码至少需要8位。",
    NUM_ONLY: "请输入数字。",
    PROCESSING: "处理中…",
    CREATE_ACCOUNT: "创建账户",
    ALREADY_HAVE_ACCOUNT: "已有账户？",
    ERR_WRONG_PW: "密码不正确。",
    ERR_ID_NOT_FOUND: "找不到此账号。",
    ERR_ID_EXISTS: "该账号已被使用。",
    ERR_TOKEN: "令牌已过期。",
    ERR_COMMON: "发生错误。请重试。",

    // Tabs
    START: "开始",
    HOME: "主页",
    HOME_MEAL: "🥗 饮食记录",
    HOME_DATA: "👀 一览",
    PROFILE: "个人资料",
    QUEST: "任务",
    RANKING: "排行",
    SETTINGS: "设置",

    // Camera & Meal
    CAMERA: "相机",
    CAMERA_HINT: "请将盘子放在正中央",
    PERMISSION_CAMERA_NEEDED: "需要相机权限",
    PERMISSION_ALLOW: "允许",
    SAVE: "保存",
    RETAKE: "重拍",
    RESULT: "分析结果",
    GOAL_SETUP: "设置目标",
    LATER: "稍后设置",
    FETCHING: "加载中…",
    NO_LIST: "没有可显示的项目。",
    DIET: "饮食",

    // Profile
    PROFILE_TITLE: "个人资料",
    ACCOUNT_INFO: "账户信息",
    CURRENT_EMAIL: "当前邮箱",
    PROFILE_INFO: "个人资料信息",
    WEIGHT: "体重(kg)",
    HEIGHT: "身高(cm)",
    AGE: "年龄",
    GENDER: "性别",
    MALE: "男",
    FEMALE: "女",
    TARGET_WEIGHT: "目标体重(kg)",
    TARGET_CALORIES: "目标卡路里(kcal)",
    UPDATE_OK: "更新成功。",
    UPDATE_FAIL: "更新失败。",
    EMAIL_INVALID: "邮箱格式不正确。",
    PW_TOO_SHORT: "新密码至少需要8位。",
    PW_MISMATCH: "两次输入的密码不一致。",
    NUMERIC_ONLY: "数字字段只接受数字。",

    // Quest/Ranking
    WALK: "走路",
    PUSHUP: "俯卧撑",
    SQUAT: "深蹲",
    DAILY_QUESTS: "每日任务",
    REWARD: "奖励",
    ALL_CLEARED_BONUS: "全部完成奖励",
    NEW: "新增",
    DONE: "完成",
    AUTO: "自动",
    LOCATION_OK: "位置可用",
    LOCATION_NEEDED: "需要权限：位置",
    ANDROID_LOCATION_HINT: "高精度，建议从电池优化中排除",
    ANDROID_ACCURACY_HINT: "高精度，建议从电池优化中排除",
    OPEN_SETTINGS: "打开设置",
    RANKING_EMPTY: "暂无可显示的排行榜。",
    LIST_LOAD_FAIL: "列表加载失败。",
    USERS_EMPTY: "暂无可显示的用户。",

    // Settings
    LANGUAGE: "语言",
    SOUND: "音效",
    ON: "开",
    OFF: "关",

    // Password Recovery
    RECOVERY: "找回密码",
    RECOVERY_SETUP: "安全问题设置",
    RECOVERY_START_DESC: "输入邮箱后将出现2个问题。",
    RECOVERY_ID: "账号 (邮箱)",
    RECOVERY_START: "获取问题",
    RECOVERY_ANSWER: "提交答案",
    RECOVERY_NEW_PW: "新密码",
    RECOVERY_RESET: "重置密码",
    RECOVERY_REGISTER_DESC: "请选择3个问题并注册答案/确认。",
    QUESTION_BIRTHPLACE: "你的出生地是？",
    QUESTION_ELEMENTARY_SCHOOL: "你就读的小学是？",
    QUESTION_PET_NAME: "你宠物的名字是？",
    QUESTION_MOTHER_NAME: "你母亲的名字是？",
    ANSWER: "答案",
    ANSWER_CONFIRM: "确认答案",
    SEND: "发送",

    // ✅ TTS 기능 추가: TACoach.jsx에서 사용
    TOD_DAWN: "凌晨",
    TOD_MORNING: "早上",
    TOD_AFTERNOON: "下午",
    TOD_EVENING: "晚上",
    WORKOUT: "锻炼",
    GREETING: "您好！我是Barbellmon教练。让我们在这个${tod}愉快地${mode}吧！",
    REPS_UNIT: "个",
    REPS_UNIT_TTS: " ",
    AUTO_COUNT_START: "我要开始自动计数了。",
    TONE_SOFT: "温柔地",
    TONE_HARD: "严厉地",
    TONE_MIX: "随机",
    TONE_CHANGE: "我会把语气改成${tone}。",
    RESET: "重置",
    PAUSE: "暂停",
    TONE_LABEL: "语气",
    TONE_VALUE: "",

    // ✅ TTS 격려/도발 메시지
    MOTIVATE: [
      "太棒了！只要坚持下去，很快就会进步的。",
      "一个一个地，循序渐进，你做得很好！",
      "你锻炼的样子很酷，继续加油！",
      "只要保持这个节奏，很快就能达成目标。",
      "再坚持一下，你肯定在成长！",
      "坚持不懈才能塑造肌肉。你做得很好！",
      "不放弃是最大的力量！",
      "呼吸保持平稳，现在非常完美！",
      "你的身体正在变得越来越强壮，感觉到了吗？",
      "再来一个！这就是今天与众不同之处。",
      "付出的努力越大，回报就越大。",
      "你今天也在遵守与自己的约定！",
      "锻炼不会背叛你。继续！",
      "就算有点辛苦，也是为了未来的自己。",
      "节奏很棒，坚持到底！",
    ],
    SPICY: [
      "这点程度就累的话，坐电梯也是运动吧？",
      "不爽吗？那就再来一个。",
      "肌肉流失打电话来了。叫你快点动起来。",
      "你今天也要成为放弃专家吗？",
      "锻炼是用身体，而不是用心。",
      "这个速度的话，烤地瓜都烤糊了。",
      "流点汗吧，别流眼泪。",
      "现在停下来的话，明天会更不想动哦？",
      "你是和床签了合同，而不是和健身房吗？",
      "肌肉不会背叛你，但是你会和椅子成为好朋友。",
      "坐着更舒服吧？那就是问题所在。",
      "不是身体，而是借口在成长吗？",
      "锻炼是免费的，但后悔是收费的。",
      "锻炼中途放弃？你今天又是椅子的MVP！",
      "你的热情是忘在哪里了？",
      "你将无法直视镜子里的自己哦？",
    ],
  },
  //보안설정
  SECURITY_SETTINGS: "安全设置",
  SECURITY_VERIFY_HINT: "请输入密码进行安全设置。",
  SECURITY_QNA: "安全问答",
  SECURITY_QNA_NOT_SET: "未设置安全问题。",
  SECURITY_VERIFY_HINT: "要登记/修改安全问答，请再次输入密码。",
  TOKEN_INVALID_OR_EXPIRED: "令牌无效或已过期。",
  TOKEN_INVALID: "令牌无效。",
  SECURITY_POLICY: "请设置安全问题及答案，以便账户找回。",
  ANSWER: "答案",
  INCORRECT_ANSWER: "答案不正确。",
  QUESTION_PET_NAME: "你宠物的名字是什么？",
  QUESTION_BIRTHPLACE: "你出生的地方是哪里？",
  QUESTION_MOTHER_NAME: "你母亲的名字是什么？",
  QUESTION_FAVORITE_TEACHER: "你最喜欢的老师的名字是什么？",
  QUESTION_FAVORITE_FOOD: "你最喜欢的食物是什么？",
  QUESTION_FIRST_SCHOOL: "你上的第一所学校的名字是什么？",
  QUESTION_FAVORITE_COLOR: "你最喜欢的颜色是什么？",
  QUESTION_BEST_FRIEND: "你最好的朋友的名字是什么？",
};

const Ctx = createContext(null);
export const useI18n = () => useContext(Ctx);

export function I18nProvider({ children }) {
  const [lang, setLang] = useState("ko");

  useEffect(() => {
    (async () => {
      const v = await AsyncStorage.getItem("@i18n/lang");
      if (v && DICT[v]) {
        setLang(v);
      }
    })();
  }, []);

  const t = useMemo(() => {
    const table = DICT[lang] || DICT.ko;
    return (key, opts) => {
      let result = table[key];
      if (typeof result === "string" && opts) {
        for (const k in opts) {
          result = result.replace(`\${${k}}`, opts[k]);
        }
      }
      return result || key;
    };
  }, [lang]);

  const value = useMemo(
    () => ({
      t,
      lang,
      setLang: async (next) => {
        const v = ["ko", "en", "ja", "zh"].includes(next) ? next : "ko";
        setLang(v);
        try {
          await AsyncStorage.setItem("@i18n/lang", v);
        } catch (e) {
          console.error("Failed to save language setting", e);
        }
      },
      getGreeting: (mode = "squat") => {
        const h = new Date().getHours();
        const tod =
          h < 5
            ? t("TOD_DAWN")
            : h < 12
            ? t("TOD_MORNING")
            : h < 18
            ? t("TOD_AFTERNOON")
            : t("TOD_EVENING");
        const modeTxt = t(mode.toUpperCase()) || t("WORKOUT");
        return t("GREETING", { tod, mode: modeTxt });
      },
      getMotivateMessage: () => {
        const messages = DICT[lang]?.MOTIVATE || DICT.ko.MOTIVATE;
        return messages[Math.floor(Math.random() * messages.length)];
      },
      getSpicyMessage: () => {
        const messages = DICT[lang]?.SPICY || DICT.ko.SPICY;
        return messages[Math.floor(Math.random() * messages.length)];
      },
      getLocalizedNumber: (number) => {
        if (lang === "zh") {
          const zhNums = {
            2: "两",
          };
          return zhNums[number] || String(number);
        }
        return String(number);
      },
    }),
    [t, lang]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
