const progressLabel = document.getElementById("progressLabel");
const panelTitle = document.getElementById("panelTitle");
const panelPrompt = document.getElementById("panelPrompt");
const panelForm = document.getElementById("panelForm");
const statusMessage = document.getElementById("statusMessage");
const backButton = document.getElementById("backButton");
const continueButton = document.getElementById("continueButton");
const adminHotspot = document.getElementById("adminHotspot");

const formState = {
  ready: "",
  favoriteCollection: "",
  favoriteCollectionReason: "",
  discordHandle: "",
  discordDuration: "",
  joinedDiscord: "",
  biggestCollectionCount: "",
  biggestCollectionName: "",
  nftUniqueness: "",
  squigsContribution: "",
  uglyBehavior: "",
  participateWithoutWl: "",
  followsX: "",
  xHandle: "",
  walletAddress: ""
};

const panels = [
  {
    title: "Welcome to Squigs",
    prompt:
      "This short application is meant to give the team a feel for who you are, how you think, and how you show up in NFT communities. Take your time, answer honestly, and let your personality come through.",
    progress: "Welcome",
    fields: []
  },
  {
    title: "Are you ready to embrace the Ugly?",
    prompt: "A few quick questions will help the Squigs team get a real feel for who you are, what you collect, and how you show up in the space.",
    progress: "Entry Gate",
    fields: [
      {
        type: "binary",
        key: "ready",
        options: ["Yes", "No"]
      }
    ]
  },
  {
    title: "",
    progress: "Question 1 of 10",
    prompt:
      "Let’s start with your taste as a collector. What is your favorite NFT collection that you currently hold, and what makes it stand out to you?",
    fields: [
      { type: "textarea", key: "favoriteCollection", placeholder: "Favorite NFT collection" },
      { type: "textarea", key: "favoriteCollectionReason", placeholder: "Why it stands out" }
    ]
  },
  {
    title: "",
    progress: "Question 2 of 10",
    prompt:
      "Community matters here. What is your Discord handle, and how long have you been active on Discord?",
    fields: [
      { type: "text", key: "discordHandle", placeholder: "Discord Handle" },
      { type: "text", key: "discordDuration", placeholder: "How long have you used Discord?" }
    ]
  },
  {
    title: "",
    progress: "Question 3 of 10",
    prompt:
      "We want people who actually want to be part of the community. Have you joined the Squigs Discord and introduced yourself? If not, you can use the Discord icon at the top of the page.",
    fields: [{ type: "binary", key: "joinedDiscord", options: ["Yes", "No"] }]
  },
  {
    title: "",
    progress: "Question 4 of 10",
    prompt:
      "Looking at your wallet as a whole, which NFT project do you hold the most of, and how many do you currently hold?",
    fields: [
      { type: "text", key: "biggestCollectionCount", placeholder: "How many?" },
      { type: "text", key: "biggestCollectionName", placeholder: "Which collection?" }
    ]
  },
  {
    title: "",
    progress: "Question 5 of 10",
    prompt:
      "A lot of people lump NFTs and crypto trading together, but they are not the same. What is something specific about NFTs that still keeps you interested?",
    fields: [{ type: "textarea", key: "nftUniqueness", placeholder: "Your answer" }]
  },
  {
    title: "",
    progress: "Question 6 of 10",
    prompt:
      "Being part of a project should mean more than just holding. If you joined Squigs, how would you contribute to the community or the project itself?",
    fields: [{ type: "textarea", key: "squigsContribution", placeholder: "How would you contribute?" }]
  },
  {
    title: "",
    progress: "Question 7 of 10",
    prompt:
      "Squigs watch behavior, not appearances. What is one ugly behavior you have noticed in NFTs or online communities that turns you off?",
    fields: [{ type: "textarea", key: "uglyBehavior", placeholder: "Observed behavior" }]
  },
  {
    title: "",
    progress: "Question 8 of 10",
    prompt: "If you do not get WL, would you still join and participate in the Squigs community?",
    fields: [{ type: "binary", key: "participateWithoutWl", options: ["Yes", "No"] }]
  },
  {
    title: "",
    progress: "Question 9 of 10",
    prompt: "Are you already following @SquigsNFT on X? If yes, drop your handle below.",
    fields: [
      { type: "binary", key: "followsX", options: ["Yes", "No"] },
      { type: "text", key: "xHandle", placeholder: "X Handle" }
    ]
  },
  {
    title: "",
    progress: "Question 10 of 10",
    prompt:
      "Last step. The team will review your answers along with your Discord and X presence to decide whether you are a strong fit for WL. Drop your Ethereum wallet below to submit.",
    fields: [{ type: "text", key: "walletAddress", placeholder: "Wallet Address" }]
  }
];

let currentPanel = 0;
let typingTimer = null;
let isSubmitting = false;

function typePrompt(text) {
  clearTimeout(typingTimer);
  panelPrompt.textContent = "";
  const speed = 18;
  let index = 0;

  function step() {
    if (index <= text.length) {
      panelPrompt.textContent = text.slice(0, index);
      index += 1;
      typingTimer = window.setTimeout(step, speed);
    }
  }

  step();
}

function createTextInput(field) {
  const input = document.createElement(field.type === "textarea" ? "textarea" : "input");
  input.className = field.type === "textarea" ? "text-area" : "text-input";
  if (field.type !== "textarea") {
    input.type = "text";
  }
  input.placeholder = field.placeholder;
  input.value = formState[field.key] || "";
  input.addEventListener("input", (event) => {
    formState[field.key] = event.target.value;
  });
  return input;
}

function createBinaryField(field) {
  const wrapper = document.createElement("div");
  wrapper.className = "binary-group";

  field.options.forEach((option) => {
    const label = document.createElement("label");
    label.className = "binary-option";
    const input = document.createElement("input");
    input.type = "radio";
    input.name = field.key;
    input.value = option;
    input.checked = formState[field.key] === option;
    if (input.checked) {
      label.classList.add("selected");
    }
    input.addEventListener("change", () => {
      formState[field.key] = option;
      renderPanel();
    });
    const text = document.createElement("span");
    text.className = "binary-label";
    text.textContent = option;
    label.appendChild(input);
    label.appendChild(text);
    wrapper.appendChild(label);
  });

  return wrapper;
}

function renderPanel() {
  const panel = panels[currentPanel];
  progressLabel.textContent = panel.progress;
  panelTitle.textContent = panel.title;
  typePrompt(panel.prompt);
  statusMessage.textContent = "";
  statusMessage.classList.remove("success");
  panelForm.innerHTML = "";

  panel.fields.forEach((field) => {
    const element = field.type === "binary" ? createBinaryField(field) : createTextInput(field);
    panelForm.appendChild(element);
  });

  backButton.disabled = isSubmitting;
  backButton.style.visibility = "visible";
  backButton.textContent = currentPanel === 0 ? "Follow Squigs" : "Back";
  document.querySelector(".panel-actions").style.justifyContent = "center";
  continueButton.disabled = isSubmitting;
  continueButton.textContent = currentPanel === panels.length - 1 ? "Submit for WL" : "Continue";
}

function validateCurrentPanel() {
  const panel = panels[currentPanel];

  if (currentPanel === 0) {
    return "";
  }

  if (currentPanel === 1) {
    if (!formState.ready) {
      return "Please choose Yes or No to continue.";
    }
    if (formState.ready === "No") {
      return "Choose Yes when you are ready to begin the application.";
    }
    return "";
  }

  for (const field of panel.fields) {
    if (field.key === "xHandle" && formState.followsX === "No") {
      continue;
    }
    if (!String(formState[field.key] || "").trim()) {
      return "Please complete this panel before continuing.";
    }
  }

  if (currentPanel === panels.length - 1 && !/^0x[a-fA-F0-9]{40}$/.test(formState.walletAddress.trim())) {
    return "Enter a valid Ethereum wallet address.";
  }

  return "";
}

async function submitForm() {
  isSubmitting = true;
  renderPanel();
  statusMessage.textContent = "Submitting...";
  statusMessage.classList.remove("success");

  try {
    const response = await fetch("/api/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formState)
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.errors ? result.errors.join(" ") : "Submission failed.");
    }

    statusMessage.textContent = "Submission received. The Squigs will review your answers.";
    statusMessage.classList.add("success");
    continueButton.disabled = true;
    backButton.disabled = true;
    panelForm.innerHTML = "";
    panelTitle.textContent = "Submitted";
    panelPrompt.textContent =
      "Your wallet and responses have been saved for review. If approved, your wallet can be copied directly from the admin dashboard export.";
  } catch (error) {
    statusMessage.textContent = error.message;
    isSubmitting = false;
    renderPanel();
    statusMessage.textContent = error.message;
  }
}

backButton.addEventListener("click", () => {
  if (isSubmitting) {
    return;
  }

  if (currentPanel === 0) {
    window.open("https://x.com/SquigsNFT", "_blank", "noopener,noreferrer");
    return;
  }

  if (currentPanel > 0) {
    currentPanel -= 1;
    renderPanel();
  }
});

continueButton.addEventListener("click", async () => {
  if (isSubmitting) {
    return;
  }

  const error = validateCurrentPanel();
  if (error) {
    statusMessage.textContent = error;
    statusMessage.classList.remove("success");
    return;
  }

  if (currentPanel === panels.length - 1) {
    await submitForm();
    return;
  }

  currentPanel += 1;
  renderPanel();
});

adminHotspot.addEventListener("click", () => {
  window.location.href = "/admin.html";
});

renderPanel();
