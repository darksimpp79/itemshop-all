package pl.ziutek.itemshop.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import pl.ziutek.itemshop.model.PlayerWallet;

import java.util.Optional;

@Repository
public interface PlayerWalletRepository extends JpaRepository<PlayerWallet, Long> {
    Optional<PlayerWallet> findByNicknameIgnoreCase(String nickname);
}
