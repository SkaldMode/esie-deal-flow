import os
import sys
from anthropic import Anthropic

def generate_and_save_tests():
    # 1. Read the API Key from environment variable
    ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")
    
    if not ANTHROPIC_API_KEY:
        print("Error: ANTHROPIC_API_KEY not found.")
        sys.exit(1)
    
    # 2. Read PR Diff from file instead of environment variable
    try:
        with open("pr_diff.txt", "r") as f:
            PR_DIFF = f.read()
    except FileNotFoundError:
        print("Error: pr_diff.txt file not found.")
        sys.exit(1)
        
    if not PR_DIFF:
        print("Error: PR_DIFF is empty.")
        sys.exit(1)
        
    # 3. Configure the Claude client
    client = Anthropic(api_key=ANTHROPIC_API_KEY)
    
    # 4. Define the instruction - THIS IS WHERE YOU CONTROL WHAT GETS TESTED
    system_prompt = (
        "You are an expert Test Engineer for a Python production system using the Pytest framework. "
        
        "CRITICAL: Generate tests that validate against these business requirements:\n"
        "1. Functions must handle None/null inputs gracefully (return default values or raise clear errors)\n"
        "2. All calculations must produce correct results (not just run without errors)\n"
        "3. Functions must validate input types and raise TypeError for wrong types\n"
        "4. String inputs must handle empty strings correctly\n"
        "5. Numeric functions must handle zero and negative numbers appropriately\n"
        "6. Functions that modify data must not have unintended side effects\n"
        "7. API/database functions must handle connection failures gracefully\n"
        "8. All functions must return expected types (if it should return a list, test that it returns a list)\n"
        "\n"
        
        "Generate tests that:\n"
        "- Test normal/happy path cases\n"
        "- Test edge cases (empty values, None, zero, negative numbers)\n"
        "- Test error conditions (invalid inputs should raise appropriate exceptions)\n"
        "- Include meaningful assertions that validate correctness, not just execution\n"
        "- Use pytest.raises() for testing expected exceptions\n"
        "\n"
        
        "You must only use standard Python libraries or dependencies already defined in the project's requirements. "
        "Return ONLY the Python code block in a fenced Markdown format with the language tag (e.g., ```python...```). "
        "Do not include any explanation, comments, or extra text outside of the code block."
    )
    
    user_message = f"Generate Pytest unit tests for the following changes:\n\n{PR_DIFF}"
    
    # 5. Call the Claude API
    try:
        message = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=2048,
            system=system_prompt,
            messages=[
                {"role": "user", "content": user_message}
            ]
        )
        
        # 6. Process and save the output
        if message.content and len(message.content) > 0:
            content_block = message.content[0]
            
            if content_block.type == "text" and hasattr(content_block, 'text'):
                code_output = content_block.text
                
                with open("claude_output.txt", "w") as f:
                    f.write(code_output)
                    
                print("Successfully generated tests and saved to claude_output.txt")
                return

        print("Error: Claude returned unparseable or non-text content.")
        sys.exit(1)
            
    except Exception as e:
        print(f"An error occurred during API call: {e}")
        sys.exit(1)

if __name__ == "__main__":
    generate_and_save_tests()
