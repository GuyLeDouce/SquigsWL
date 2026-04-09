const progressLabel = document.getElementById("progressLabel");
const panelTitle = document.getElementById("panelTitle");
const panelPrompt = document.getElementById("panelPrompt");
const panelForm = document.getElementById("panelForm");
const statusMessage = document.getElementById("statusMessage");
const backButton = document.getElementById("backButton");
const continueButton = document.getElementById("continueButton");

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
    title: "Are you ready to embrace the Ugly?",
    prompt: "",
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
    title: "Panel 1",
    progress: "Question 1 of 10",
    prompt:
      "At Ugly Labs, we are all about community, collecting, and having fun. We like to learn more about our community and welcome like minded people that are passionate about the space in all walks, not just our own little world. That said, what is your favorite NFT Collection that you currently hold and why does it stand out to you?",
    fields: [
      { type: "textarea", key: "favoriteCollection", placeholder: "Favorite NFT collection" },
      { type: "textarea", key: "favoriteCollectionReason", placeholder: "Why it stands out to you" }
    ]
  },
  {
    title: "Panel 2",
    progress: "Question 2 of 10",
    prompt:
      "Squigs love games, building bots, and having fun in discord. What is your Discord handle, and how long have you been using Discord?",
    fields: [
      { type: "text", key: "discordHandle", placeholder: "Discord Handle" },
      { type: "text", key: "discordDuration", placeholder: "How Long?" }
    ]
  },
  {
    title: "Panel 3",
    progress: "Question 3 of 10",
    prompt:
      "We would love to invite you to join us in discord, meet the great people of Ugly Labs, and be part of the amazing community. Have you joined our discord and introduced yourself to the community? Hit the discord icon in the top corner of this page to join.",
    fields: [{ type: "binary", key: "joinedDiscord", options: ["Yes", "No"] }]
  },
  {
    title: "Panel 4",
    progress: "Question 4 of 10",
    prompt:
      "Squigs are digital collectibles, more commonly known as NFTs. In your collection of NFTs, what project do you hold the most of, and how many do you hold?",
    fields: [
      { type: "text", key: "biggestCollectionCount", placeholder: "How many?" },
      { type: "text", key: "biggestCollectionName", placeholder: "Which collection?" }
    ]
  },
  {
    title: "Panel 5",
    progress: "Question 5 of 10",
    prompt:
      "Crypto trading and NFTs have long been spoken of as one in the same, but they are very different in many ways. What is something unique about NFTs that keep you interested and intrigued?",
    fields: [{ type: "textarea", key: "nftUniqueness", placeholder: "Your answer" }]
  },
  {
    title: "Panel 6",
    progress: "Question 6 of 10",
    prompt:
      "Being part of an NFT project often means more than just simply holding to some people. If you were part of Squigs, how would you contribute to the community and or project?",
    fields: [{ type: "textarea", key: "squigsContribution", placeholder: "How would you contribute?" }]
  },
  {
    title: "Panel 7",
    progress: "Question 7 of 10",
    prompt:
      "Squigs are observers, watching Ugly behaviour. Not looks, but how people act and carry themselves. What is one ugly behavior that you have noticed in NFTs or online communities?",
    fields: [{ type: "textarea", key: "uglyBehavior", placeholder: "Observed behavior" }]
  },
  {
    title: "Panel 8",
    progress: "Question 8 of 10",
    prompt: "If you do not get WL for some reason, will you still join and participate in the community?",
    fields: [{ type: "binary", key: "participateWithoutWl", options: ["Yes", "No"] }]
  },
  {
    title: "Panel 9",
    progress: "Question 9 of 10",
    prompt: "Are you following @SquigsNFT on X? If so, drop your X handle below.",
    fields: [
      { type: "binary", key: "followsX", options: ["Yes", "No"] },
      { type: "text", key: "xHandle", placeholder: "X Handle" }
    ]
  },
  {
    title: "Panel 10",
    progress: "Question 10 of 10",
    prompt:
      "The team will review your answers to all of the previous questions, check activity on X and Discord, and decide whether you are a good fit for WL. Drop your Ethereum wallet below to be eligible.",
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

  backButton.disabled = currentPanel === 0 || isSubmitting;
  continueButton.disabled = isSubmitting;
  continueButton.textContent = currentPanel === panels.length - 1 ? "Submit for WL" : "Continue";
}

function validateCurrentPanel() {
  const panel = panels[currentPanel];

  if (currentPanel === 0) {
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
  if (currentPanel > 0 && !isSubmitting) {
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

renderPanel();
