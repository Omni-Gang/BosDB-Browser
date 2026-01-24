import { GoogleLogin } from '@react-oauth/google';

interface GoogleAuthButtonProps {
    onSuccess: (credentialResponse: any) => void;
    onError: () => void;
    text?: string;
    width?: string;
}

export function GoogleAuthButton({ onSuccess, onError, text = 'signin_with', width = '350' }: GoogleAuthButtonProps) {
    return (
        <div className="w-full flex justify-center">
            <GoogleLogin
                onSuccess={onSuccess}
                onError={onError}
                theme="filled_black"
                shape="rectangular"
                size="large"
                width={width}
                text={text as any} // 'signin_with' | 'signup_with' | 'continue_with'
            />
        </div>
    );
}
