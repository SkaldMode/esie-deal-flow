import os
import sys
from anthropic import Anthropic

def generate_and_save_tests():
    # 1. Read the API Key and PR Diff from environment variables
    # The API key is securely loaded by the GitHub Action environment
    ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")
    PR_DIFF = os.environ.get("PR_DIFF")
    
    if not ANTHROPIC_API_KEY:
        print("Error: ANTHROPIC_API_KEY not found.")
        sys.exit(1)
        
    if not PR_DIFF:
        print("Error: PR_DIFF (git diff) not found.")
        # If the diff is empty (e.g., in a non-PR run), we exit gracefully
        # In a real PR, this should contain the changes.
        return
        
    # 2. Configure the Claude client
    client = Anthropic(api_key=ANTHROPIC_API_KEY) #
    
    # 3. Define the instruction (System Prompt) and the user input (PR Diff)
    # This is the prompt engineering step to ensure high-fidelity output.
    system_prompt = (
        "You are an expert Test Engineer for a production system. "
        "Your task is to generate comprehensive unit tests for the functions modified in the pull request diff. "
        "You must use the Pytest framework and adhere strictly to idiomatic Python testing practices. "
        "Return ONLY the Python code block in a fenced Markdown format (e.g., ```python...```). "
        "Do not include any explanation, comments, or extra text outside of the code block."
    )
    
    user_message = f"Generate Pytest unit tests for the following changes:\n\n{PR_DIFF}"
    
    # 4. Call the Claude API
    try:
        message = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=2048,
            system=system_prompt,
            messages=[
                {"role": "user", "content": user_message}
            ]
        )
        
        # 5. Save the raw output to a file for later parsing
# We save the raw response (which includes the markdown fences)
with open("claude_output.txt", "w") as f:
    # --- THIS LINE IS THE FIX ---
    # We check if the content list exists and has items, and then access the 
    # 'text' property of the FIRST item in that list.
    if message.content and message.content.text:
        f.write(message.content.text)
    else:
        # Fallback for unexpected or empty content
        print("Error: Claude returned empty or unparseable content.")
        sys.exit(1)
        
print("Successfully generated tests and saved to claude_output.txt")

except Exception as e:
#... (rest of the code is unchanged)
        print(f"An error occurred during API call: {e}")
        sys.exit(1)

if __name__ == "__main__":
    generate_and_save_tests()
