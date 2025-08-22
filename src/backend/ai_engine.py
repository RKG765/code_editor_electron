#!/usr/bin/env python3
"""
AI Engine for Code Editor
Handles both online (OpenAI/Groq) and offline (llama.cpp) AI processing
"""

import os
import asyncio
import subprocess
import json
import logging
from typing import Dict, Any, Optional
from datetime import datetime
import tempfile
import platform

logger = logging.getLogger(__name__)

class AIEngine:
    def __init__(self):
        self.online_mode_available = False
        self.offline_mode_available = False
        self.openai_api_key = None
        self.groq_api_key = None
        self.llama_model_path = None
        self.llama_executable = None
        
        # Persona configurations
        self.personas = {
            'teacher': {
                'system_prompt': "You are a patient, educational programming teacher. Explain concepts clearly with examples and encourage learning. Use simple language and provide step-by-step explanations.",
                'style': 'educational'
            },
            'hacker': {
                'system_prompt': "You are a skilled, efficient hacker-style programmer. Give concise, advanced solutions. Focus on performance, clever tricks, and cutting-edge techniques. Be direct and technical.",
                'style': 'advanced'
            },
            'reviewer': {
                'system_prompt': "You are a thorough code reviewer. Analyze code quality, suggest improvements, point out potential issues, and recommend best practices. Be constructive and detailed.",
                'style': 'analytical'
            }
        }
    
    def initialize(self) -> bool:
        """Initialize the AI engine with available modes"""
        success = False
        
        # Check for online API keys
        self.openai_api_key = os.getenv('OPENAI_API_KEY')
        self.groq_api_key = os.getenv('GROQ_API_KEY')
        
        if self.openai_api_key or self.groq_api_key:
            self.online_mode_available = True
            logger.info("Online AI mode available")
            success = True
        else:
            logger.warning("No API keys found for online mode")
        
        # Check for offline model
        self.setup_offline_mode()
        if self.offline_mode_available:
            logger.info("Offline AI mode available")
            success = True
        
        return success
    
    def setup_offline_mode(self):
        """Setup offline AI mode with llama.cpp"""
        models_dir = os.path.join(os.path.dirname(__file__), 'models')
        
        # Look for model files
        if os.path.exists(models_dir):
            for file in os.listdir(models_dir):
                if file.endswith(('.ggml', '.bin', '.gguf')):
                    self.llama_model_path = os.path.join(models_dir, file)
                    break
        
        # Look for llama.cpp executable
        system = platform.system().lower()
        if system == 'windows':
            executable_name = 'llama.exe'
        else:
            executable_name = 'llama'
        
        # Check in common locations
        possible_paths = [
            os.path.join(os.path.dirname(__file__), executable_name),
            os.path.join(os.path.dirname(__file__), 'llama.cpp', executable_name),
            executable_name  # System PATH
        ]
        
        for path in possible_paths:
            if os.path.exists(path) or self.check_executable_in_path(path):
                self.llama_executable = path
                break
        
        if self.llama_model_path and self.llama_executable:
            self.offline_mode_available = True
            logger.info(f"Offline mode configured: {self.llama_executable} with {self.llama_model_path}")
        else:
            logger.info(f"Offline mode not available - Model: {self.llama_model_path}, Executable: {self.llama_executable}")
    
    def check_executable_in_path(self, executable):
        """Check if executable exists in system PATH"""
        try:
            subprocess.run([executable, '--version'], 
                         capture_output=True, 
                         check=True, 
                         timeout=5)
            return True
        except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
            return False
    
    async def explain_code(self, code: str, persona: str = 'teacher', mode: str = 'online') -> str:
        """Explain the given code"""
        persona_config = self.personas.get(persona, self.personas['teacher'])
        
        prompt = f"""
{persona_config['system_prompt']}

Please explain the following code:

```
{code}
```

Explain what this code does, how it works, and any important concepts involved.
"""
        
        return await self.generate_response(prompt, mode)
    
    async def translate_code(self, code: str, target_language: str, persona: str = 'teacher', mode: str = 'online') -> str:
        """Translate code to another programming language"""
        persona_config = self.personas.get(persona, self.personas['teacher'])
        
        prompt = f"""
{persona_config['system_prompt']}

Please translate the following code to {target_language}:

```
{code}
```

Provide the translated code and explain any important differences or considerations.
"""
        
        return await self.generate_response(prompt, mode)
    
    async def optimize_code(self, code: str, persona: str = 'hacker', mode: str = 'online') -> str:
        """Optimize the given code"""
        persona_config = self.personas.get(persona, self.personas['hacker'])
        
        prompt = f"""
{persona_config['system_prompt']}

Please optimize the following code for better performance, readability, and maintainability:

```
{code}
```

Provide the optimized version and explain what improvements were made.
"""
        
        return await self.generate_response(prompt, mode)
    
    async def chat(self, message: str, persona: str = 'teacher', mode: str = 'online') -> str:
        """General chat with AI assistant"""
        persona_config = self.personas.get(persona, self.personas['teacher'])
        
        prompt = f"""
{persona_config['system_prompt']}

User message: {message}

Please respond helpfully as a programming assistant.
"""
        
        return await self.generate_response(prompt, mode)
    
    async def fix_error(self, code: str, error_message: str, persona: str = 'reviewer', mode: str = 'online') -> str:
        """Fix errors in code"""
        persona_config = self.personas.get(persona, self.personas['reviewer'])
        
        prompt = f"""
{persona_config['system_prompt']}

The following code is producing an error:

Code:
```
{code}
```

Error message:
```
{error_message}
```

Please analyze the error, explain what's wrong, and provide a corrected version of the code.
"""
        
        return await self.generate_response(prompt, mode)
    
    async def generate_response(self, prompt: str, mode: str = 'online') -> str:
        """Generate AI response using specified mode"""
        if mode == 'online' and self.online_mode_available:
            return await self.generate_online_response(prompt)
        elif mode == 'offline' and self.offline_mode_available:
            return await self.generate_offline_response(prompt)
        else:
            # Fallback mode
            if self.online_mode_available:
                return await self.generate_online_response(prompt)
            elif self.offline_mode_available:
                return await self.generate_offline_response(prompt)
            else:
                return self.generate_fallback_response(prompt)
    
    async def generate_online_response(self, prompt: str) -> str:
        """Generate response using online AI API"""
        try:
            if self.openai_api_key:
                return await self.call_openai_api(prompt)
            elif self.groq_api_key:
                return await self.call_groq_api(prompt)
            else:
                raise Exception("No online API keys available")
        except Exception as e:
            logger.error(f"Online AI request failed: {e}")
            # Fallback to offline if available
            if self.offline_mode_available:
                logger.info("Falling back to offline mode")
                return await self.generate_offline_response(prompt)
            else:
                return f"Sorry, I couldn't process your request. Error: {str(e)}"
    
    async def call_openai_api(self, prompt: str) -> str:
        """Call OpenAI API"""
        try:
            import openai
            openai.api_key = self.openai_api_key
            
            response = await asyncio.to_thread(
                openai.Completion.create,
                engine="gpt-3.5-turbo-instruct",
                prompt=prompt,
                max_tokens=1000,
                temperature=0.7,
                top_p=1,
                frequency_penalty=0,
                presence_penalty=0
            )
            
            return response.choices[0].text.strip()
        except ImportError:
            logger.error("OpenAI library not installed. Install with: pip install openai")
            raise Exception("OpenAI library not available")
        except Exception as e:
            logger.error(f"OpenAI API call failed: {e}")
            raise
    
    async def call_groq_api(self, prompt: str) -> str:
        """Call Groq API"""
        try:
            import requests
            
            url = "https://api.groq.com/openai/v1/completions"
            headers = {
                "Authorization": f"Bearer {self.groq_api_key}",
                "Content-Type": "application/json"
            }
            data = {
                "model": "mixtral-8x7b-32768",
                "prompt": prompt,
                "max_tokens": 1000,
                "temperature": 0.7
            }
            
            def make_request():
                response = requests.post(url, headers=headers, json=data, timeout=30)
                response.raise_for_status()
                return response.json()
            
            result = await asyncio.to_thread(make_request)
            return result["choices"][0]["text"].strip()
            
        except ImportError:
            logger.error("Requests library not installed. Install with: pip install requests")
            raise Exception("Requests library not available")
        except Exception as e:
            logger.error(f"Groq API call failed: {e}")
            raise
    
    async def generate_offline_response(self, prompt: str) -> str:
        """Generate response using local llama.cpp"""
        try:
            # Create temporary file for prompt
            with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
                f.write(prompt)
                prompt_file = f.name
            
            # Run llama.cpp
            cmd = [
                self.llama_executable,
                '-m', self.llama_model_path,
                '-f', prompt_file,
                '-n', '500',  # max tokens
                '-t', '4',    # threads
                '--temp', '0.7',
                '--top-p', '0.9',
                '--repeat-penalty', '1.1'
            ]
            
            def run_llama():
                result = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    timeout=60  # 1 minute timeout
                )
                return result
            
            result = await asyncio.to_thread(run_llama)
            
            # Clean up
            os.unlink(prompt_file)
            
            if result.returncode == 0:
                response = result.stdout.strip()
                # Clean up the response (remove prompt echo, etc.)
                lines = response.split('\n')
                # Find where the actual response starts
                response_start = 0
                for i, line in enumerate(lines):
                    if line.strip() and not line.startswith(prompt[:50]):
                        response_start = i
                        break
                
                cleaned_response = '\n'.join(lines[response_start:]).strip()
                return cleaned_response if cleaned_response else "I apologize, but I couldn't generate a proper response."
            else:
                logger.error(f"Llama.cpp error: {result.stderr}")
                return f"Sorry, there was an error processing your request: {result.stderr}"
                
        except subprocess.TimeoutExpired:
            return "Sorry, the request timed out. Please try again with a shorter prompt."
        except Exception as e:
            logger.error(f"Offline AI generation failed: {e}")
            return f"Sorry, I encountered an error: {str(e)}"
    
    def generate_fallback_response(self, prompt: str) -> str:
        """Generate a fallback response when AI is not available"""
        if "explain" in prompt.lower():
            return """I'm sorry, but I don't have access to AI services right now. 
            
To enable AI features:
1. For online mode: Set OPENAI_API_KEY or GROQ_API_KEY environment variable
2. For offline mode: Place a GGML/GGUF model file in the models/ directory and ensure llama.cpp is available

In the meantime, I can help you with basic code operations through the file explorer and editor."""

        elif "translate" in prompt.lower():
            return """I can't translate code without AI services, but here are some general tips:

- Python to JavaScript: Focus on syntax differences (indentation vs braces, def vs function)
- JavaScript to Python: Watch out for variable scoping and type differences
- Java to Python: Consider Python's dynamic typing and simpler syntax

Please set up AI services for full translation capabilities."""

        elif "optimize" in prompt.lower():
            return """Without AI services, here are general optimization tips:

- Remove unused variables and imports
- Use appropriate data structures (lists vs sets vs dicts)
- Avoid nested loops when possible
- Cache expensive operations
- Use list comprehensions for simple transformations

Set up AI services for detailed, code-specific optimization suggestions."""

        else:
            return """I'm currently running in limited mode without AI services.

To enable full AI capabilities:
1. Set OPENAI_API_KEY or GROQ_API_KEY environment variable for online mode
2. Set up llama.cpp with a local model for offline mode

I can still help you with file operations, editing, and basic code management."""