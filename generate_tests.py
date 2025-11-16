import os
import sys
from anthropic import Anthropic

def generate_and_save_tests():
    # 1. Read the API Key and PR Diff from environment variables
    ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")
    PR_DIFF = os.environ.get("PR_DIFF")
    
    if not ANTHROPIC_API_KEY:
        print("Error: ANTHROPIC_API_KEY not found.")
        sys.exit(1)
        
    if not PR_DIFF:
        print("Error: PR_DIFF (git diff) not found.")
        # If the diff is empty, we exit gracefully.
        return
        
    # 2. Configure the Claude client
    client = Anthropic(api_key=ANTHROPIC_API_KEY)
    
    # 3. Define the instruction (System Prompt) and the user input (PR Diff)
    system_prompt = (
        "You are an expert Test Engineer for a Python production system using the Pytest framework. "
        "Your primary goal is to generate robust, high-coverage unit tests for the functions modified in the pull request diff. "
        "You must only use standard Python libraries or dependencies already defined in the project's requirements. "
        "Crucially, ensure tests include assertions that validate behavior, not just execution, and aim for high branch coverage. "
        "Return ONLY the Python code block in a fenced Markdown format (e.g., ```python...```). "
        "Do not include any explanation, comments, or extra text outside of the code block."
    )
    
    user_message = f"Generate Pytest unit tests for the following changes:\n\n{PR_DIFF}"
    
    # 4. Call the Claude API
    try:
        message = client.messages.create(
            # Using the stable, working alias that successfully connected in the last run
            model="claude-sonnet-4-5",
            max_tokens=2048,
            system=system_prompt,
            messages=[
                {"role": "user", "content": user_message}
            ]
        )
        
        # 5. Process and save the output (Fixes the SyntaxError and the 'list' object error)
        # We assume the generated code is in the first content block and is text.
        if message.content and message.content.text:
            code_output = message.content.text
            
            # The 'with open' block is now correctly placed and indented
            with open("claude_output.txt", "w") as f:
                f.write(code_output)
                
            print("Successfully generated tests and saved to claude_output.txt")
        else:
            print("Error: Claude returned empty or unparseable content.")
            sys.exit(1)
            
    except Exception as e:
        # This handles API errors (e.g., network, authentication, etc.)
        print(f"An error occurred during API call: {e}")
        sys.exit(1)

if __name__ == "__main__":
    generate_and_save_tests()
