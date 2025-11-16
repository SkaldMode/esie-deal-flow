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
            # Using the stable model alias
            model="claude-sonnet-4-5",
            max_tokens=2048,
            system=system_prompt,
            messages=[
                {"role": "user", "content": user_message}
            ]
        )
        
       # 5. Process and save the output (Definitive Fix for Content Access)
        
        # Check if the content list exists and has at least one item
        if message.content and len(message.content) > 0:
            # We assume the generated text is in the first content block (index 0)
            content_block = message.content
            
            # Check if this content block is of type 'text' and has the.text attribute
            if content_block.type == "text" and hasattr(content_block, 'text'):
                code_output = content_block.text
                
                with open("claude_output.txt", "w") as f:
                    f.write(code_output)
                    
                print("Successfully generated tests and saved to claude_output.txt")
                return # Exit successfully
            
        # If execution reaches here, Claude returned something unexpected or non-text
        print("Error: Claude returned unparseable or non-text content.")
        sys.exit(1)
            
    except Exception as e:
        # This handles network or API errors
        print(f"An error occurred during API call: {e}")
        sys.exit(1)
